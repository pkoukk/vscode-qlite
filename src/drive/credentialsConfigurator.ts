import { DriveAuthenticator } from './driveAuthenticator';
import { window } from 'vscode';
import { google } from 'googleapis';

export class CredentialsConfigurator {
  constructor(private authenticator: DriveAuthenticator) {}

  checkCredentialsConfigured(): void {
    this.authenticator
      .checkCredentialsConfigured()
      .then(() => {})
      .catch(() => {
        const yesButton = 'Yes';
        const dontShowAgain = `Don't show again`;
        window
          .showInformationMessage(
            `It looks like you don't have Google Drive API credentials configured. Do you want to configure them now?`,
            yesButton,
            'No',
            dontShowAgain
          )
          .then((selectedButton) => {
            switch (selectedButton) {
              case yesButton:
                this.configureCredentials();
                break;
              case dontShowAgain:
                break;
            }
          });
      });
  }

  configureCredentials(): void {
    window.showInformationMessage(
      'Please select the credentials file previously generated from your Google API Console.'
    );
    window
      .showOpenDialog({
        filters: {
          'Google credentials (*.json)': ['json']
        }
      })
      .then((files) => {
        if (files && files.length > 0) {
          const selectedCredentialsFile = files[0].fsPath;
          this.authenticator
            .storeApiCredentials(selectedCredentialsFile)
            .then(() => {
              window.showInformationMessage('Credentials successfully stored!');
              this.page();
            })
            .catch((err) => window.showErrorMessage(err));
        } else {
          window.showWarningMessage(
            `'Configure credentials' operation canceled by user.`
          );
        }
      });
  }

  async page(): Promise<void> {
    this.authenticator
      .authenticate()
      .then((auth: any) => {
        const service = google.drive({ version: 'v3', auth });
        service.files
          .list({ pageSize: 1, fields: 'files(id)' })
          .then((res) => {})
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
