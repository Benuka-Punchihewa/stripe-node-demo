require("dotenv").config();
const express = require("express");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.set("view engine", "ejs");
app.use(express.static("public"));

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/success", (req, res) => {
  res.render("success");
});

app.get("/cancel", (req, res) => {
  res.render("cancel");
});

app.get("/card-payments-prebuilt", (req, res) => {
  res.render("card-payments-prebuilt");
});

app.get("/card-payments-custom", (req, res) => {
  res.render("card-payments-custom", {
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get("/card-saving-custom", (req, res) => {
  res.render("card-saving-custom", {
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// for prebuilt card payments
app.post("/create-checkout-session", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Logitech G412 Mechanical Keyboard",
          },
          //unit price should be entered in pennies
          unit_amount: 20000, //equivalent to $ 200
        },
        quantity: 2,
      },
    ],
    mode: "payment",
    success_url: `http://127.0.0.1:${port}/success`,
    cancel_url: `http://127.0.0.1:${port}/cancel`,
  });

  res.redirect(303, session.url);
});

// for custom card payments
app.post("/create-payment-intent", async (req, res) => {
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 40000, // this can be replaced with calculate order functions amount: calculateOrder()
    currency: "eur",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

//setup intent for saving the card
app.post("/setup-intent", async (req, res) => {
  // Create a PaymentIntent with the order amount and currency
  const intent = await await stripe.setupIntents.create({
    customer: "cus_M3ZgLyaiC2CVFb",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: intent.client_secret,
  });
});

const createCustomer = async () => {
  const customer = await stripe.customers.create({
    name: "John Doe",
    email: "johndoe@gmail.com",
  });
  console.log(customer);
};

const start = async () => {
  try {
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.error(error);
  }
};

start();
