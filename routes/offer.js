const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");

const isAuthenticated = require("../middlewares/isAuthenticated");

const User = require("../models/User");
const Offer = require("../models/Offer");

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};
router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const { title, description, price, condition, city, brand, size, color } =
        req.body;

      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ÉTAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        owner: req.user._id,
      });

      if (req.files) {
        const picture = await cloudinary.uploader.upload(
          convertToBase64(req.files.picture),
          {
            folder: `/vinted/offer/${newOffer._id}`,
          }
        );
        newOffer.product_image = picture;
        await newOffer.save();
        const owner = await User.findById(req.user._id);

        result = {
          _id: newOffer.id,
          product_name: newOffer.product_name,
          product_description: newOffer.product_description,
          product_price: newOffer.product_price,
          product_details: newOffer.product_details,
          owner: owner.account,
          product_image: picture,
        };
      } else {
        await newOffer.save();
        const owner = await User.findById(req.user._id);

        result = {
          _id: newOffer.id,
          product_name: newOffer.product_name,
          product_description: newOffer.product_description,
          product_price: newOffer.product_price,
          product_details: newOffer.product_details,
          owner: owner.account,
        };
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put("/offer/update", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      price,
      condition,
      city,
      brand,
      size,
      color,
    } = req.body;

    const offerToUpdate = await Offer.findById(id);

    if (title) {
      offerToUpdate.product_name = title;
    }
    if (description) {
      offerToUpdate.product_description = description;
    }
    if (price) {
      offerToUpdate.product_price = price;
    }
    if (condition) {
      offerToUpdate.product_details[2]["ÉTAT"] = condition;
    }
    if (city) {
      offerToUpdate.product_details[4]["EMPLACEMENT"] = city;
    }
    if (brand) {
      offerToUpdate.product_details[0]["MARQUE"] = brand;
    }
    if (size) {
      offerToUpdate.product_details[1]["MARQUE"] = size;
    }
    if (color) {
      offerToUpdate.product_details[3]["COULEUR"] = color;
    }

    if (req.files) {
      const picture = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        {
          folder: `/vinted/offer/${newOffer._id}`,
        }
      );
      offerToUpdate.product_image = picture;
      await offerToUpdate.save();

      result = {
        _id: offerToUpdate.id,
        product_name: offerToUpdate.product_name,
        product_description: offerToUpdate.product_description,
        product_price: offerToUpdate.product_price,
        product_details: offerToUpdate.product_details,
        owner: req.user.account,
        product_image: picture,
      };
    } else {
      await offerToUpdate.save();
      result = {
        _id: offerToUpdate.id,
        product_name: offerToUpdate.product_name,
        product_description: offerToUpdate.product_description,
        product_price: offerToUpdate.product_price,
        product_details: offerToUpdate.product_details,
        owner: req.user.account,
      };
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete(
  "/offer/delete",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const offerToDelete = await Offer.findById(req.body.id).populate("owner");
      if (!offerToDelete) {
        return res.status(400).json({ message: "Cette annonce n'existe pas" });
      }

      if (req.user.token === offerToDelete.owner.token) {
        const deleteResult = await Offer.deleteOne({ _id: req.body.id });
        res.status(200).json({ message: "L'annonce a bien été supprimée" });
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    let { title, priceMin, priceMax, sort, page } = req.query;
    let filters = {};

    if (title) {
      const regExp = new RegExp(`${title}`, "i");
      filters.product_name = regExp;
    }

    if (priceMin && !priceMax) {
      filters.product_price = { $gte: priceMin };
    } else if (priceMax && !priceMin) {
      filters.product_price = { $lte: priceMax };
    } else if (priceMax && priceMin) {
      filters.product_price = { $gte: priceMin, $lte: priceMax };
    }

    if (!sort || sort === "price-asc") {
      sort = "asc";
    } else {
      sort = "desc";
    }
    if (!page) {
      page = 1;
    }

    const offerPerPage = 5;
    const offerToSkip = (page - 1) * offerPerPage;

    const offers = await Offer.find(filters)
      .populate("owner", "account")
      // .select("product_name product_price")
      // .limit(5)
      .skip(offerToSkip)
      .sort({ product_price: sort });

    offerWithoutLimit = await Offer.find(filters);
    const count = offerWithoutLimit.length;

    res.json({ count, offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/offer/:id", isAuthenticated, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate("owner");
    if (req.user.token === offer.owner.token) {
      const result = await Offer.findById(req.params.id).populate(
        "owner",
        "account"
      );
      res.status(200).json(result);
    } else {
      res.status(400).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
