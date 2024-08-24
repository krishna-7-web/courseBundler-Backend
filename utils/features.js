import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";

const uplaodFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          // getBase64(file),
          {
            resource_type: "auto",
            public_id: uuid(),
            folder: "CorseBundler",
            // chunk_size: "50mb",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        )
        .end(file.buffer);
    });
  });

  try {
    const results = await Promise.all(uploadPromises);

    const formatedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));

    return formatedResults;
  } catch (err) {
    throw new Error("Error uploading files to cloudinary", err);
  }
};

export { uplaodFilesToCloudinary };
