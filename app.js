require("dotenv").config();
const express = require("express");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

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

app.get("/payment-saved-card", (req, res) => {
  res.render("payment-saved-card");
});

app.get("/auth-and-caputre-custom-card-payments", (req, res) => {
  res.render("auth-and-caputre-custom-card-payments", {
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
    customer: "john-doe-01",
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

//create payment intent to make payments using an existing customer
app.post("/create-payment-intent-saved-card", async (req, res) => {
  try {
    // retrieve payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: "cus_M3ZgLyaiC2CVFb",
      type: "card",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 40000,
      currency: "eur",
      customer: "cus_M3ZgLyaiC2CVFb",
      payment_method: paymentMethods.data[0].id,
      off_session: true,
      confirm: true,
    });

    console.log(paymentIntent);

    res.send({
      message: "success",
    });
  } catch (err) {
    // Error code will be authentication_required if authentication is needed
    console.log("Error code is: ", err.code);
    const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(
      err.raw.payment_intent.id
    );
    console.log("PI retrieved: ", paymentIntentRetrieved.id);

    //***********************************************
    // If the payment failed due to an authentication_required decline code,
    //  use the declined PaymentIntent???s client secret and payment method with
    //  confirmCardPayment to allow the customer to authenticate the payment.

    res.send({
      message: "failed",
    });
  }
});

// make payments using auth and capture - custom payment flow
app.post("/create-payment-intent-auth-and-capture", async (req, res) => {
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 40000, // this can be replaced with calculate order functions amount: calculateOrder()
    currency: "eur",
    customer: "john-doe-01",
    payment_method_types: ["card"],
    capture_method: "manual",
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// make payments using auth and capture - custom payment flow
app.post("/capture-payment", async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.capture(req.body.intentId, {
    // amount_to_capture: 30000, // only to capture less that the authorized amount
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// cancel authorized payments
app.post("/cancel-payment", async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.cancel(req.body.intentId);
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

const createCustomer = async () => {
  const customer = await stripe.customers.create({
    id: "john-doe-01",
    name: "John Doe",
    email: "johndoe@gmail.com",
  });
  console.log(customer);
};
// createCustomer();

//confrim payment from server side
const confirmPayment = async (intentId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
  console.log(paymentIntent.status);
};
confirmPayment("pi_3LLW5PGJagRSuZvG1IPLMMRn");

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
