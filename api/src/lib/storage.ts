import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

/**
 * Onde as fotos dos produtos ficam guardadas. Duas opções, escolhidas pelo .env:
 *  - local: pasta no disco (UPLOAD_DIR), servida em /uploads. Ideal com disco persistente.
 *  - s3:    qualquer serviço compatível com S3 (Amazon S3, Cloudflare R2, Backblaze B2...).
 * O resto do código só conhece esta interface, não sabe onde o arquivo está.
 */
export interface FileStorage {
  save(key: string, data: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export const uploadDir = resolve(env.UPLOAD_DIR);

class LocalStorage implements FileStorage {
  async save(key: string, data: Buffer) {
    const path = join(uploadDir, key);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, data);
  }

  async remove(key: string) {
    await rm(join(uploadDir, key), { force: true });
  }

  publicUrl(key: string) {
    return `/uploads/${key}`;
  }
}

class S3Storage implements FileStorage {
  private client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials:
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });

  async save(key: string, data: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  }

  publicUrl(key: string) {
    return `${env.S3_PUBLIC_URL?.replace(/\/$/, '')}/${key}`;
  }
}

export const storage: FileStorage =
  env.STORAGE_DRIVER === 's3' ? new S3Storage() : new LocalStorage();

const SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: 'image/png',
    ext: 'png',
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    type: 'image/webp',
    ext: 'webp',
    test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  },
];

/**
 * Descobre o tipo real da imagem pelos primeiros bytes do arquivo ("assinatura").
 * Não confiamos só no nome/extensão nem no Content-Type, que o navegador pode mentir.
 */
export function detectImageType(data: Buffer) {
  return SIGNATURES.find((signature) => signature.test(data)) ?? null;
}
