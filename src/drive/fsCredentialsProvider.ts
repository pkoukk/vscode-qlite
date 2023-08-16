import {
  ICredentialsProvider,
  CREDENTIALS_JSON_SERVICE,
  TOKENS_JSON_SERVICE
} from './credentialsManager';

import { join as PJoin } from 'path';
import { readFileSync, writeFile } from 'fs';

interface IEnv {
  [key: string]: string;
}

export class FsCredentialsProvider implements ICredentialsProvider {
  filePath: string;
  env: IEnv = {};

  constructor(root: string) {
    this.filePath = PJoin(root, 'credentials.json');
    console.log('Credentials file path: ' + this.filePath);
    try {
      this.env = JSON.parse(readFileSync(this.filePath).toString());
    } catch (e) {
      this.env = {};
    }
  }

  getPassword(service: string, _account: string): Promise<string | null> {
    return new Promise((resolve) => {
      const envName = this.resolveEnvName(service);
      const envValue: any = this.env[envName];
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
    this.env[envName] = password;
    this.flushEnvToFile();
    return new Promise((resolve) => resolve());
  }

  deletePassword(service: string, account: string): Promise<boolean> {
    const envName = this.resolveEnvName(service);
    delete this.env[envName];
    this.flushEnvToFile();
    return new Promise((resolve) => resolve(true));
  }

  flushEnvToFile(): Promise<void> {
    try {
      writeFile(
        this.filePath,
        JSON.stringify(this.env),
        { encoding: 'utf8' },
        (err) => {}
      );
    } catch (e) {
      console.error(e);
    }
    return new Promise((resolve) => resolve());
  }
}
