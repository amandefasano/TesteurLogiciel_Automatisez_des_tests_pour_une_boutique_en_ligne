import { faker } from "@faker-js/faker";

const apiRegisterUrl = `${Cypress.env("apiUrl")}/register`;
const productsUrl = `${Cypress.env("baseUrl")}/products`;
const apiProduct3Url = `${Cypress.env("apiUrl")}/products/3`;
const apiAddProductUrl = `${Cypress.env("apiUrl")}/orders/add`;
const apiOrdersUrl = `${Cypress.env("apiUrl")}/orders`;

describe("tests API /orders", () => {
  before(function () {
    // Logging in a user
    cy.simulate_login(
      Cypress.env("apiEmail"),
      Cypress.env("apiPassword")
    ).then(() => {
      // Adding a product in the cart
      cy.request({
        method: "PUT",
        url: apiAddProductUrl,
        headers: {
          Authorization: `Bearer ${Cypress.env("token")}`,
        },
        body: {
          product: 3,
          quantity: 1,
        },
      }).then(function (response) {
        cy.wrap(response.body.orderLines[0].id).as("id");
      });
    });

    // Creating random user data
    cy.wrap(faker.person.firstName()).as("randomFirstName");
    cy.wrap(faker.person.lastName()).as("randomLastName");
    cy.wrap(faker.location.streetAddress()).as("randomAddress");
    cy.wrap(faker.location.city()).as("randomCity");
  });

  it("GET /orders: is getting the connected user's cart", function () {
    cy.request({
      method: "GET",
      url: apiOrdersUrl,
      failOnStatusCode: false,
      headers: {
        Authorization: `Bearer ${Cypress.env("token")}`,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("id").that.is.a("number");
      expect(response.body).to.have.property("orderLines");

      response.body.orderLines.forEach((orderLine) => {
        expect(orderLine).to.have.property("id").to.be.a("number");
        expect(orderLine)
          .to.have.nested.property("product.id")
          .to.be.a("number");
        expect(orderLine).to.have.property("quantity").to.be.a("number");
      });
    });
  });

  it("PUT /orders/add: is adding an available product in the cart", function () {
    cy.request({
      method: "PUT",
      url: apiAddProductUrl,
      headers: {
        Authorization: `Bearer ${Cypress.env("token")}`,
      },
      body: {
        product: 5,
        quantity: 1,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("id").to.be.a("number");
      expect(response.body).to.have.property("orderLines");
      expect(response.body)
        .to.have.nested.property("orderLines[1].id")
        .to.be.a("number");
      expect(response.body)
        .to.have.nested.property("orderLines[1].product.id", 5)
        .to.be.a("number");
      expect(response.body)
        .to.have.nested.property("orderLines[1].quantity", 1)
        .to.be.a("number");
    });
  });

  it("PUT /orders/{id}/change-quantity: is modifying the quantity", function () {
    cy.request({
      method: "PUT",
      url: `${apiOrdersUrl}/${this.id}/change-quantity`,
      headers: {
        Authorization: `Bearer ${Cypress.env("token")}`,
      },
      body: {
        quantity: 2,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("id").to.be.a("number");
      expect(response.body).to.have.property("orderLines");
      expect(response.body)
        .to.have.nested.property("orderLines[0].id")
        .to.be.a("number");
      expect(response.body)
        .to.have.nested.property("orderLines[0].product.id", 3)
        .to.be.a("number");
      expect(response.body)
        .to.have.nested.property("orderLines[0].quantity", 2)
        .to.be.a("number");
    });
  });

  it("DELETE /{id}/delete: is removing a product from the cart", function () {
    cy.request({
      method: "DELETE",
      url: `${apiOrdersUrl}/${this.id}/delete`,
      headers: {
        Authorization: `Bearer ${Cypress.env("token")}`,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("id").to.be.a("number");
      expect(response.body).to.have.property("orderLines");
      expect(response.body)
        .to.have.nested.property("orderLines[0].id")
        .to.not.eq(this.id);
      expect(response.body).to.have.property("orderLines").to.have.length(1);
    });
  });

  it("POST /orders: is sending an order", function () {
    cy.request({
      method: "POST",
      url: apiOrdersUrl,
      headers: {
        Authorization: `Bearer ${Cypress.env("token")}`,
      },
      body: {
        firstname: this.randomFirstName,
        lastname: this.randomLastName,
        address: this.randomAddress,
        zipCode: "13008",
        city: this.randomCity,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("id").to.be.a("number");
      expect(response.body)
        .to.have.property("firstname")
        .to.deep.eq(this.randomFirstName)
        .to.be.a("string");
      expect(response.body)
        .to.have.property("lastname")
        .to.deep.eq(this.randomLastName)
        .to.be.a("string");
      expect(response.body)
        .to.have.property("address")
        .to.deep.eq(this.randomAddress)
        .to.be.a("string");
      expect(response.body)
        .to.have.property("zipCode")
        .to.deep.eq("13008")
        .to.be.a("string");
      expect(response.body)
        .to.have.property("city")
        .to.deep.eq(this.randomCity)
        .to.be.a("string");
      expect(response.body)
        .to.have.property("date")
        .that.satisfies((value) => !isNaN(Date.parse(value)));
      expect(response.body).to.have.property("validated").to.be.true;
      expect(response.body).to.have.property("orderLines");

      response.body.orderLines.forEach((orderLine) => {
        expect(orderLine).to.have.property("id").to.be.a("number");
        expect(orderLine)
          .to.have.nested.property("product.id")
          .to.be.a("number");
        expect(orderLine).to.have.property("quantity").to.be.a("number");
      });
    });
  });
});

describe("negative scenarios", () => {
  before(function () {
    // Registering a new random user
    const randomEmail = faker.internet.email();
    const randomFirstName = faker.person.firstName();
    const randomLastName = faker.person.lastName();
    const randomPwd = faker.internet.password();
    const pwd = randomPwd;

    cy.request({
      method: "POST",
      url: apiRegisterUrl,
      body: {
        email: randomEmail,
        firstname: randomFirstName,
        lastname: randomLastName,
        plainPassword: {
          first: pwd,
          second: pwd,
        },
      },
    }).then(function (response) {
      // logging in the user
      cy.simulate_login(response.body.email, response.body.plainPassword).then(
        function (response) {
          cy.wrap(response.body.token).as("token");
        }
      );
    });
  });

  it("is trying to get a newly registered user's empty cart: expects error 404", function () {
    cy.request({
      method: "GET",
      url: apiOrdersUrl,
      failOnStatusCode: false,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    }).then((response) => {
      expect(response.status).to.eq(404);
    });
  });

  it("is trying to get a non logged in user's cart: expects error 403", () => {
    cy.request({
      method: "GET",
      url: apiOrdersUrl,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(403);
    });
  });

  it("is trying to add an out of stock product in the cart: expects error 404", function () {
    cy.intercept(apiProduct3Url, {
      statusCode: 200,
      body: {
        id: 3,
        name: "Sentiments printaniers",
        availableStock: 0,
        skin: "Propre, fra\u00eeche",
        aromas: "Frais et fruit\u00e9",
        ingredients: "Framboise, zeste de citron et feuille de menthe",
        description:
          "Savon avec une formule douce \u00e0 base d\u2019huile de framboise, de citron et de menthe qui nettoie les mains efficacement sans les dess\u00e9cher.",
        price: 60,
        picture:
          "https://cdn.pixabay.com/photo/2020/02/08/10/35/soap-4829708_960_720.jpg",
        varieties: 4,
      },
    }).as("outOfStockProduct3");

    cy.visit(productsUrl);

    /*// Targetting the first product and clicking on the "consult" button //*/
    cy.get('.list-products > [data-cy="product"]')
      .eq(0)
      .find('[data-cy="product-link"]')
      .click();

    // Redirection to the product information sheet
    cy.wait("@outOfStockProduct3");
    
    cy.request({
      method: "PUT",
      url: apiAddProductUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: {
        product: 3,
        quantity: 1,
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(404);
      expect(response.body)
        .to.have.property("message")
        .to.deep.equal("En rupture de stock.");
    });
  });
});
