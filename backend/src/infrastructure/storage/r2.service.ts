import { Inject, Injectable } from "@nestjs/common";
import { GetObjectCommand, HeadObjectCommand, NotFound, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageConfig, StorageConfig } from "@/config/namespaces/storage.config";

export type ObjectInfo = {
	contentLength: number;
	etag: string | null;
};

@Injectable()
export class R2Service {
	private readonly client: S3Client;
	private readonly bucket: string;

	constructor(@Inject(storageConfig.KEY) private readonly storageConfig: StorageConfig) {
		this.bucket = this.storageConfig.bucket;

		this.client = new S3Client({
			region: "auto",
			endpoint: `https://${this.storageConfig.accountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: this.storageConfig.accessKeyId,
				secretAccessKey: this.storageConfig.secretAccessKey,
			},
		});
	}

	async createUploadUrl(params: { key: string; contentType: string }): Promise<string> {
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: params.key,
			ContentType: params.contentType,
		});

		return getSignedUrl(this.client, command, {
			expiresIn: 300,
		});
	}

	async getObjectInfo(key: string): Promise<ObjectInfo | null> {
		try {
			const object = await this.client.send(
				new HeadObjectCommand({
					Bucket: this.bucket,
					Key: key,
				}),
			);

			return {
				contentLength: object.ContentLength ?? 0,
				etag: object.ETag ?? null,
			};
		} catch (error) {
			if (error instanceof NotFound) {
				return null;
			}
			throw error;
		}
	}

	async createReadUrl(
		key: string,
		expiresIn = 60,
	): Promise<string> {
		return getSignedUrl(
			this.client,
			new GetObjectCommand({
				Bucket: this.bucket,
				Key: key,
				ResponseContentDisposition: 'inline',
			}),
			{ expiresIn },
		);
	}
}
