const { User } = require("../models/User")
const { ctrlWrapper, HttpError, sendEmail } = require('../helpers')
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const fs = require("fs/promises")
const path = require("path")
const Jimp = require("jimp");
const { nanoid } = require("nanoid");

const { SECRET_KEY } = process.env



const register = async (req, res) => {

    const { email, password} = req.body
    const user = await User.findOne({ email })
    if (user) {
        throw HttpError(409, "Email in use")
    }

    const hashPassword = await bcrypt.hashSync(password, 10)

    const avatarURL = gravatar.url(email, { s: '250', r: 'x', d: 'retro' }, false)
    const verificationToken = nanoid();

    const newUser = await User.create({ ...req.body, password: hashPassword, verificationToken,avatarURL })
    
    const verificateEmeil = {
        to: email,
        subject: "Verify email",
        html: `<a target = "_blank" href = "http://localhost:3000/api/users/verify/${verificationToken}"> Click verify email</a>`,
    }
    await sendEmail(verificateEmeil)
   
    res.status(201).json({
        "user": {
            "email": newUser.email,
            "subscription": newUser.subscription,
        }
    })
}


const verifyEmail = async (req, res) => { 
    const { verificationToken } = req.params
    const user = await User.findOne({ verificationToken })

    if (!user) {
         throw HttpError(404, "User not found")
    }
    
    await User.findByIdAndUpdate(user._id, { verify: true, verificationToken: null })
    
    res.json({message: "Verification successful"})
}


const resendVerifyEmail = async(req, res)=> {
    const { email } = req.body;

    const user = await User.findOne({email});
    if(!user) {
        throw HttpError(401, "Email not found");
    }
    if(user.verify) {
        throw HttpError(400, "Verification has already been passed");
    }

   const verificateEmeil = {
        to: email,
        subject: "Verify email",
       html: `<a target = "_blank" href = "http://localhost:3000/api/users/verify/${user.verificationToken}"> Click verify email</a>`,
    }
    await sendEmail(verificateEmeil)

    res.json({
        message: "Verification email sent"
    })
}





const login = async (req, res) => {
    const { email, password, id} = req.body
    const user = await User.findOne({ email })
    
    if (!user) {
        throw HttpError(401, "Email or password is wrong")
    }

     const passwordCompare = await bcrypt.compare(password, user.password)
    
    
    if (!passwordCompare) {
        throw HttpError(401, "Email or password is wrong")
    }

    if (!user.verify) {
        throw HttpError(404, "User not found")
    }
    
     const payload = {
        id: user._id,
    }

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "24h" })
    await User.findByIdAndUpdate(user._id, { token })

         res.status(200).json({
        "token": token,
        "user": {
            "email": user.email,
            "subscription": user.subscription
        }
    })   
}



const current = async (req, res) => {
    if (!req || !req.user) {
        throw HttpError(401, "Not authorized")
    }

    res.status(200).json({
        "email": req.user.email,
        "subscription": req.user.subscription
    })
}

const logout = async (req, res) => {
    const { _id } = req.user
    await User.findByIdAndUpdate({ _id }, { token:"" })

    res.status(204).json({ message: "No Content" })
}



const updateSubscription = async (req, res, next) => {
    if (!req || !req.user) {
        throw HttpError(401, "Not authorized")
    }
    const data = await User.findByIdAndUpdate(req.user._id, req.body, {new: true })
     if (!data) {
      throw HttpError(404,"Not Found")
    }
    res.json({"email": data.email,
        "subscription": data.subscription})
}



const updateAvatars = async (req, res, next) => {
    if (!req || !req.user) {
        throw HttpError(401, "Not authorized")
    }

    if (!req.file) {
    throw HttpError(400, "No file uploaded");
    }

    const destination = req.file.path

    const avatar = await Jimp.read(destination);
      await avatar.resize(250, 250).write(destination);

    const newFileName = req.user._id + '-' + Date.now() + "." + req.file.mimetype.split("/")[1]
    const avatarsDir = path.join(__dirname, "../", "public", "avatars")
    const newDestination = path.join(avatarsDir, newFileName)
    
    await fs.rename(destination, newDestination)

    const data = await User.findByIdAndUpdate(req.user._id, {avatarURL:newDestination}, { new: true })

if (!data) {
        throw HttpError(404, "Not Found")
    }

    res.json({
        "avatarURL": data.avatarURL})
}



module.exports = {
    register: ctrlWrapper(register),
    verifyEmail: ctrlWrapper(verifyEmail),
    resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
    login: ctrlWrapper(login),
    current: ctrlWrapper(current),
    logout: ctrlWrapper(logout),
    updateSubscription: ctrlWrapper(updateSubscription),
    updateAvatars: ctrlWrapper(updateAvatars)
}