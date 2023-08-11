import { getMimeType } from 'stream-mime-type';
import mime_types from 'mime-types';
import { google, drive_v3 } from 'googleapis';
import axios from 'axios';
import { PrivateMessage, GroupMessage } from 'icqq';
import Global from '../global';

var myClient: drive_v3.Drive;
var uploaded: Set<string> = new Set();

function getDrive(auth: any): drive_v3.Drive {
  return google.drive({ version: 'v3', auth });
}

export async function authorize(): Promise<any> {
  return new Promise((resolve, reject) => {
    Global.authenticator
      .authenticate()
      .then((auth: any) => {
        resolve(auth);
      })
      .catch((err) => reject(null));
  });
}

export async function initClient(): Promise<void> {
  const auth = await authorize();
  if (auth) {
    const drive = getDrive(auth);
    myClient = drive;
    await loadUploaded(drive);
  }
}

async function getClient(): Promise<drive_v3.Drive | null> {
  if (!myClient) {
    await initClient();
  }
  return myClient;
}

async function loadUploaded(service: drive_v3.Drive): Promise<void> {
  try {
    const res = await service.files.list({
      pageSize: 50,
      q: "parents='13jejHQPPEJkxfdRa-AtDDkrsatkIIikU'",
      fields: 'files(name)'
    });
    const files = res.data.files;
    if (files && files.length > 0) {
      files.map((file) => {
        if (file.name) {
          const id = getMessageIdOfImageName(file.name);
          uploaded.add(id);
        }
      });
    }
  } catch (err) {
    console.log('load uploaded failed:' + err);
  }
}

export async function listFiles(): Promise<void> {
  const service = await getClient();
  if (!service) {
    return;
  }
  const res = await service.files.list({
    pageSize: 5,
    fields: 'nextPageToken, files(id, name)',
    spaces: 'drive'
  });
  const files = res.data.files;
  if (files && files.length > 0) {
    console.log('Files:');
    files.map((file) => {
      console.log(`${file.name} (${file.id})`);
    });
  }
}

export async function saveMessages(
  messages: (PrivateMessage | GroupMessage)[]
): Promise<void> {
  for (let i = 0; i < messages.length; i++) {
    await saveMessage(messages[i]);
  }
}

export async function saveMessage(param: PrivateMessage | GroupMessage) {
  if (param.message_type !== 'private') {
    return;
  }
  if (uploaded.has(param.message_id)) {
    return;
  }
  const senderName = param.sender.nickname;
  for (let i = 0; i < param.message.length; i++) {
    const elem = param.message[i];
    switch (elem.type) {
      case 'image':
      case 'flash':
        const imageName = buildImageName(param.message_id, senderName, i);
        await uploadBasic(elem.url, imageName);
        break;
    }
  }
  uploaded.add(param.message_id);
}

function buildImageName(messageId: string, sender: string, id: number): string {
  return `${sender}_${messageId}_${id}`;
}

function getMessageIdOfImageName(imageName: string): string {
  const parts = imageName.split('_');
  if (parts.length < 2) {
    return '';
  }
  return parts[1];
}

export async function uploadBasic(
  imageUrl: string | undefined,
  name: string
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const service = await getClient();
  if (!service) {
    return;
  }

  const data = await axios.get(imageUrl, { responseType: 'stream' });
  const imageStream = data.data;
  const { stream, mime } = await getMimeType(imageStream);
  const ext = mime_types.extension(mime) as string;
  const filename = `${name}.${ext}`;
  const requestBody = {
    name: filename,
    parents: ['13jejHQPPEJkxfdRa-AtDDkrsatkIIikU'],
    fields: 'id'
  };

  const media = {
    mimeType: mime,
    body: stream
  };
  try {
    const file = await service.files.create({
      requestBody,
      media: media
    });
    console.log(`Uploaded file:${filename}, file id:${file.data.id}`);
  } catch (err) {
    console.log('Upload failed :' + err);
  }
}
