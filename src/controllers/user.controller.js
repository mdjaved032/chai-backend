import { asyncHandler } from "../utils/asyncHandeler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponce.js"

const registerUser = asyncHandler( async (req, res) => {

  // 01. get user details from frontend
  const { userName, email, fullName, password } = req.body
  // console.log("email: ", email);
  
  // 02. validation - not empty
  if (
    [userName, email, fullName, password].some(fields => fields?.trim() === "")
  ) {
    throw new ApiError("All fields are required");
    
  }
  
  // 03. check if user already exists: username, email
  const existedUser = await User.findOne({
    $or: [{email}, {userName}]
  })
  
  if(existedUser){
    throw new ApiError(409, "User with email or username already exists")
  }
  
  // 04. check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;   // this also valid it can be use instead of classic method
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  // 05. upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  // 06. create user object, create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase()
  })

  // 07. remove password and refresh token from responce
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  // 08. check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  // 09. return responce
  return res.status(201).json(
    new ApiResponce(200, createdUser, "User registered Successfully")
  )
})

export { registerUser }