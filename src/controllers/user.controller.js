import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    
    // Get user details
    const {username, email, fullName, password} = req.body 
    
    // validation - not empty
    if (
        [username, email, fullName, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Full name cannot be empty")
    }
    
    // Check if user already exists
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }
    // check for images, avatar
    const avatarLocalPath =req.files?.avatar[0]?.path

    if (!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    // upload them to cloudinary
    console.log("avatarLocalPath", avatarLocalPath);
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar){
        throw new ApiError(400, "Avatar upload failed")
    }
    // Create user object - entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering User")
    }
    // remove password and refresh token field from response
    // check for user creation
    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
})

const loginUser = asyncHandler(async (req,res)=>{
    // req body
    const {email, username, password} = req.body

    // username or email validation
    if (!email || !username) {
        throw new ApiError(400, "Email or username is required")
    }

    // check if user exists
    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if (!user){
        throw new ApiError(404, "User not found")
    }

    // check for password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Password not valid")
    }

    // access token and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie
    options = {
        httpOnly: true,
        secure: true
    }

    return res
            .status(200)
            .cookie("accessToken",accessToken, options)
            .cookie("refreshToken",refreshToken, options)
            .json(
                new ApiResponse(200, {
                    user: loggedInUser,accessToken,refreshToken
                }, "User logged in successfully")
            )

})

const logoutUser = asyncHandler(async (req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
            {
                new: true
            }
    )
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, null, "User logged out successfully"))
})

export { registerUser, loginUser, logoutUser }