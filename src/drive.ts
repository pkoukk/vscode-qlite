import { GoogleAuth, OAuth2Client, auth } from 'google-auth-library';
import { authenticate } from '@google-cloud/local-auth';
import { getMimeType } from 'stream-mime-type';
import mime_types from 'mime-types';
import { google } from 'googleapis';
import * as fs from 'fs/promises';
import Global from './global';
import * as path from 'path';
import dayjs from 'dayjs';
import axios from 'axios';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
var myClient: OAuth2Client;

function getTokenPath(): string {
    return path.join(Global.rootDir, 'token.json');
}

function getCredentialsPath(): string {
    return path.join(Global.rootDir, 'credentials.json');
}

async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
    try {
        const content = await fs.readFile(getTokenPath());
        const credentials = JSON.parse(content.toString());
        // const auth = new GoogleAuth();
        // auth.fromJSON(credentials);
        const client = auth.fromJSON(credentials);
        return client as OAuth2Client;
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client: OAuth2Client): Promise<void> {
    const content = await fs.readFile(getCredentialsPath());
    const keys = JSON.parse(content.toString());
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(getTokenPath(), payload);
}

export async function authorize(): Promise<OAuth2Client> {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: getCredentialsPath(),
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

export async function initClient(): Promise<void> {
    const client = await authorize();
    myClient = client;
}

async function getClient(): Promise<OAuth2Client> {
    if (!myClient) {
        await initClient();
    }
    return myClient;
}

export async function listFiles(): Promise<void> {
    const client = await getClient();
    const service = google.drive({ version: 'v3', auth: client });
    const res = await service.files.list({
        pageSize: 5,
        fields: 'nextPageToken, files(id, name)',
        spaces: "drive"
    });
    const files = res.data.files;
    if (files && files.length > 0) {
        console.log('Files:');
        files.map((file) => {
            console.log(`${file.name} (${file.id})`);
        });
    }
}

export async function uploadBasic(imageUrl: string | undefined, senderName: string): Promise<void> {
    if (!imageUrl) {
        return
    }
    const data = await axios.get(imageUrl, { responseType: 'stream' })
    const imageStream = data.data;
    const { stream, mime } = await getMimeType(imageStream);
    const ext = mime_types.extension(mime) as string;
    const filename = `${senderName}_${dayjs().format('YYYYMMDDTHH:mm:ss')}.${ext}`;
    const requestBody = {
        name: filename,
        parents: ["13jejHQPPEJkxfdRa-AtDDkrsatkIIikU"],
        fields: 'id',
    };

    const client = await getClient();
    const service = google.drive({ version: 'v3', auth: client });
    const media = {
        mimeType: mime,
        body: stream,
    };
    try {
        const file = await service.files.create({
            requestBody,
            media: media,
        });
        console.log(`Uploaded file:${filename}, file id:${file.data.id}`);
    } catch (err) {
        console.log("Upload failed :" + err);
    }
}