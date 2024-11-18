const express = require('express');
const {validateBody, authenticate, upload} = require('../../middlewares')
const { registerSchema,emailSchema, loginSchema } = require("../../models/User")
const ctrl = require('../../controllers/auth-controllers')

const router = express.Router();

router.post('/register', validateBody(registerSchema), ctrl.register)
router.post('/login', validateBody(loginSchema), ctrl.login)
router.get('/current', authenticate, ctrl.current)
router.post('/logout', authenticate, ctrl.logout)
router.patch('/', authenticate, ctrl.updateSubscription)
router.patch('/avatars', authenticate, upload.single("avatar"), ctrl.updateAvatars)
router.get('/verify/:verificationToken', ctrl.verifyEmail)
router.post("/verify", validateBody(emailSchema), ctrl.resendVerifyEmail);

module.exports = router;
