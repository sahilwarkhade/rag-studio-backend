import { Queue } from "bullmq";

export const FILE_UPLOAD_QUEUE = "file-upload-file";
export const FILE_DELETE_QUEUE = "file-delete-file";

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 500,
  removeOnFail: 500,
};

export const connectionOptions = {
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const fileUploadQueue = new Queue(FILE_UPLOAD_QUEUE, {
  connection: connectionOptions,
  defaultJobOptions,
});

export const fileDeleteQueue = new Queue(FILE_DELETE_QUEUE, {
  connection: connectionOptions,
  defaultJobOptions,
});

await Promise.all([
  fileUploadQueue.waitUntilReady(),
  fileDeleteQueue.waitUntilReady(),
]);
