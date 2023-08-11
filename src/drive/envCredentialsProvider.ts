import {
  ICredentialsProvider,
  CREDENTIALS_JSON_SERVICE,
  TOKENS_JSON_SERVICE
} from './credentialsManager';

export class EnvCredentialsProvider implements ICredentialsProvider {
  getPassword(service: string, _account: string): Promise<string | null> {
    return new Promise((resolve) => {
      const envName = this.resolveEnvName(service);
      const envValue: any = process.env[envName];
      resolve(envValue);
    });
  }

  resolveEnvName(service: string): string {
    switch (service) {
      case CREDENTIALS_JSON_SERVICE:
        return 'DRIVE_CREDENTIALS';
      case TOKENS_JSON_SERVICE:
        return 'DRIVE_TOKEN';
      default:
        return 'invalid';
    }
  }

  setPassword(
    service: string,
    account: string,
    password: string
  ): Promise<void> {
    const envName = this.resolveEnvName(service);
    process.env[envName] = password;
    return new Promise((resolve) => resolve());
  }

  deletePassword(service: string, account: string): Promise<boolean> {
    const envName = this.resolveEnvName(service);
    delete process.env[envName];
    return new Promise((resolve) => resolve(true));
  }
}
