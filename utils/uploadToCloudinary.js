const cloudinary =
  require("../config/cloudinary");

const streamifier =
  require("streamifier");

// =====================================================
// UPLOAD BUFFER TO CLOUDINARY
// =====================================================

const uploadToCloudinary = (
  buffer,
  folder,
  resourceType = "auto"
) => {

  return new Promise(
    (resolve, reject) => {

      // -----------------------------------------------
      // VALIDATE BUFFER
      // -----------------------------------------------

      if (
        !buffer ||
        !Buffer.isBuffer(buffer)
      ) {

        return reject(
          new Error(
            "A valid file buffer is required for Cloudinary upload."
          )
        );
      }

      // -----------------------------------------------
      // VALIDATE FOLDER
      // -----------------------------------------------

      if (
        !folder ||
        typeof folder !== "string"
      ) {

        return reject(
          new Error(
            "A valid Cloudinary folder is required."
          )
        );
      }

      // -----------------------------------------------
      // CREATE UPLOAD STREAM
      // -----------------------------------------------

      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder,

            resource_type:
              resourceType
          },

          (error, result) => {

            if (error) {

              console.error(
                "Cloudinary upload error:",
                error
              );

              return reject(
                error
              );
            }

            if (!result) {

              return reject(
                new Error(
                  "Cloudinary did not return an upload result."
                )
              );
            }

            return resolve(
              result
            );
          }
        );

      // -----------------------------------------------
      // SEND BUFFER TO CLOUDINARY
      // -----------------------------------------------

      streamifier
        .createReadStream(buffer)
        .pipe(uploadStream);
    }
  );
};

// =====================================================
// EXPORT
// =====================================================

module.exports =
  uploadToCloudinary;