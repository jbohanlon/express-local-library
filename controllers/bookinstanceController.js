const { body, validationResult } = require("express-validator");
const async = require("async");

const Book = require("../models/book");
const BookInstance = require("../models/bookinstance");

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate("book")
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance === null) {
        // No results.
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance_detail", {
        title: "Copy: " + bookinstance.book.title,
        bookinstance: bookinstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, "title").exec(function (err, books) {
    if (err) {
      return next(err);
    }
    // Successful, so render.
    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields.
  body("book", "Book is a required field.").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint is a required field.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    // There are errors, so render the form again with sanitized values and error messages.
    if (!errors.isEmpty()) {
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        // Successful, so render.
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      // Data from form is valid.
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance === null) {
        // No results.
        res.redirect("/catalog/bookinstances");
      }
      // Successful, so render.
      res.render("bookinstance_delete", {
        title: "Delete Bookinstance",
        bookinstance: bookinstance,
      });
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res) {
  BookInstance.findByIdAndRemove(req.body.id, function deleteBookinstance(err) {
    if (err) {
      return next(err);
    }
    // Successful, so redirect to the list of Bookinstances
    res.redirect("/catalog/bookinstances");
  });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res, next) {
  async.parallel(
    {
      instance: function (callback) {
        BookInstance.findById(req.params.id).populate("book").exec(callback);
      },
      books: function (callback) {
        Book.find(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      // No results.
      if (results.instance === null) {
        let err = new Error("Book copy not found");
        err.status(404);
        return next(err);
      }
      // Success
      res.render("bookinstance_form", {
        title: "Update BookInstance",
        book_list: results.books,
        selected_book: results.instance.book._id,
        bookinstance: results.instance,
      });
    }
  );
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  body("book")
    .trim()
    .escape()
    .isLength({ min: 1 })
    .withMessage("Book is a required field."),
  body("imprint")
    .trim()
    .escape()
    .isLength({ min: 1 })
    .withMessage("Imprint is a required field."),
  body("status").escape(),
  body("due_back", "Due back must be a valid date format")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  // Process request after validation and sanitization
  (req, res, next) => {
    // Store errors
    const errors = validationResult(req);

    // Create a new BookInstance using the data that a user entered which you sanitized above.
    // Note that you're also setting _id to the current BookInstance's id because
    // you want to update it instead of creating something completely new.
    let instance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // If there are errors, render the form again with sanitized data and error messages
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        // Successful, so render
        res.render("bookinstance_form", {
          title: "Update BookInstance",
          book_list: books,
          selected_book: instance.book._id,
          errors: errors.array(),
          bookinstance: instance,
        });
        return;
      });
      return;
    } else {
      // If there aren't errors, update the BookInstance record
      BookInstance.findByIdAndUpdate(
        req.params.id,
        instance,
        {},
        function (err, theInstance) {
          if (err) {
            return next(err);
          }
          // Successful update, so redirect to the BookInstance's detail page
          res.redirect(theInstance.url);
        }
      );
    }
  },
];
