const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const User = require("../models/User");
const Offer = require("../models/Offer");

router.post("/user/signup", async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;

    const checkEmail = await User.findOne({ email: email });
    if (checkEmail) {
      return res.json({ message: "This email already exists in the system" });
    }

    if (!username) {
      res.json({ message: "The username is missing" });
    }

    const salt = uid2(16);
    const hash = SHA256(salt + password).toString(encBase64);
    const token = uid2(64);

    const newUser = new User({
      email: email,
      account: {
        username: username,
        avatar: null,
      },
      newsletter: newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });

    await newUser.save();

    const result = {
      _id: newUser._id,
      token: token,
      account: {
        username: username,
      },
    };

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    userToCheck = await User.findOne({ email: email });
    if (!userToCheck) {
      return res.json({ message: "Email does not exist in the system" });
    }

    const hash2 = SHA256(userToCheck.salt + password).toString(encBase64);
    if (hash2 !== userToCheck.hash) {
      res.json({ message: "Email or password is incorrect" });
    } else {
      const answer = {
        _id: userToCheck._id,
        token: userToCheck.token,
        account: {
          username: userToCheck.account.username,
        },
      };
      res.json(answer);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
