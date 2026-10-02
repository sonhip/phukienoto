const cloudinary = require("cloudinary").v2;

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET),
  );
}

if (isConfigured()) {
  if (process.env.CLOUDINARY_URL) {
    const parsed = new URL(process.env.CLOUDINARY_URL);
    cloudinary.config({
      cloud_name: parsed.hostname,
      api_key: parsed.username,
      api_secret: decodeURIComponent(parsed.password),
      secure: true,
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

function getFolder() {
  return (process.env.CLOUDINARY_FOLDER || "smartlifehub").replace(
    /^\/+|\/+$/g,
    "",
  );
}

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || getFolder(),
        resource_type: options.resourceType || "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

function uploadFile(filePath, options = {}) {
  return cloudinary.uploader.upload(filePath, {
    folder: options.folder || getFolder(),
    resource_type: options.resourceType || "auto",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });
}

function destroy(publicId, resourceType = "image") {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

module.exports = {
  cloudinary,
  destroy,
  getFolder,
  isConfigured,
  uploadBuffer,
  uploadFile,
};
