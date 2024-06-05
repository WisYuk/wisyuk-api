const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: process.env.KEY
});
// 
const bucketName = process.env.BUCKET;
const bucket = storage.bucket(bucketName);

const uploadFileStream = async (fileStream, destination) => {
    const blob = bucket.file(destination);
    const blobStream = blob.createWriteStream({
        resumable: false,
        public: true,
    });

    return new Promise((resolve, reject) => {
        fileStream.pipe(blobStream)
            .on('finish', () => {
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                resolve(publicUrl);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
};

module.exports = uploadFileStream;