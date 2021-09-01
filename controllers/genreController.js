const { body, validationResult } = require("express-validator");

const async = require("async");
const Book = require("../models/book");
const Genre = require("../models/genre");

// Display list of all Genre.
exports.genre_list = function (req, res, next) {
  Genre.find()
    .sort([["name", "ascending"]])
    .exec(function (err, list_genres) {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render("genre_list", {
        title: "Genre List",
        genre_list: list_genres,
      });
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function (req, res, next) {
  async.parallel(
    {
      genre: function (callback) {
        Genre.findById(req.params.id).exec(callback);
      },

      genre_books: function (callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.genre === null) {
        // No results.
        const err = new Error("Genre not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render
      res.render("genre_detail", {
        title: "Genre Detail",
        genre: results.genre,
        genre_books: results.genre_books,
      });
    }
  );
};

// Display Genre create form on GET.
exports.genre_create_get = function (req, res, next) {
  res.render("genre_form", { title: "Create Genre" });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and santize the name field.
  body("name", "Genre name is a required field.").trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre({ name: req.body.name });

    // There are errors, so render the form again with sanitized values/error messages.
    if (!errors.isEmpty()) {
      res.render("genre_form", {
        title: "Create Genre",
        genre: genre,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ name: req.body.name }).exec(function (err, found_genre) {
        if (err) {
          return next(err);
        }

        if (found_genre) {
          // Genre exists, redirect to its detail page.
          res.redirect(found_genre.url);
        } else {
          genre.save(function (err) {
            if (err) {
              return next(err);
            }
            // Genre saved. Redirect to Genre detail page.
            res.redirect(genre.url);
          });
        }
      });
    }
  },
];

// Display Genre delete form on GET.
exports.genre_delete_get = function (req, res, next) {
  async.parallel(
    {
      genre: function (callback) {
        Genre.findById(req.params.id).exec(callback);
      },
      genre_books: function (callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.genre === null) {
        // No results.
        res.redirect("/catalog/genres");
      }
      // Successful, so render.
      res.render("genre_delete", {
        title: "Delete Genre",
        genre: results.genre,
        genre_books: results.genre_books,
      });
    }
  );
};

// Handle Genre delete on POST.
exports.genre_delete_post = function (req, res, next) {
  async.parallel(
    {
      genre: function (callback) {
        Genre.findById(req.body.genreid).exec(callback);
      },
      genre_books: function (callback) {
        Book.find({ genre: req.body.genreid }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      // Success
      if (results.genre_books.length > 0) {
        // Genre has books. Render in same way as for GET route.
        res.render("genre_delete", {
          title: "Delete Genre",
          gemre: results.gemre,
          genre_books: results.genre_books,
        });
        return;
      } else {
        // Genre has no books. Delete object and redirect to the list of genres.
        Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
          if (err) {
            return next(err);
          }
          // Success - go to genre list
          res.redirect("/catalog/genres");
        });
      }
    }
  );
};

// Display Genre update form on GET.
exports.genre_update_get = function (req, res, next) {
  Genre.findById(req.params.id, function (err, genre) {
    if (err) {
      return next(err);
    }

    // No results
    if (genre === null) {
      let err = new Error("Genre not found");
      err.status(404);
      return next(err);
    }

    // Success
    res.render("genre_form", {
      title: "Update genre",
      genre: genre,
    });
  });
};

// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate data
  body("name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Name is a required field.")
    .isAlphanumeric()
    .withMessage("A genre's name must only contain alphanumeric characters."),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Store errors
    const errors = validationResult(req);

    // Create a new Genre using the data entered by a user and sanitized above.
    // Note that you're also setting _id to the current Genre's id because
    // you want to update it instead of creating something completely new.
    let genre = new Genre({ name: req.body.name, _id: req.params.id });

    if (!errors.isEmpty()) {
      // If there are errors, render the form again with sanitized data and error messages
      res.render("genre_form", {
        title: "Update genre",
        genre: genre,
        errors: errors.array(),
      });
      return;
    } else {
      // If there aren't any errors, update the Genre record
      Genre.findByIdAndUpdate(
        req.params.id,
        genre,
        {},
        function (err, theGenre) {
          if (err) {
            return next(err);
          }
          // Successful update, so redirect to the Genre's detail page
          res.redirect(theGenre.url);
        }
      );
    }
  },
];
