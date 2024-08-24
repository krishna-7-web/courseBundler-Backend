export const sendToken = (res, user, message, statusCode = 200) => {
  const token = user.getJWTToken();
  // console.log("token", token);

  const options = {
    httpOnly: true,
    secure: true, // Secure only in production
    sameSite: "none", // Ensure cross-site cookies are allowed
    expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
  };
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    message,
    user,
  });
};
