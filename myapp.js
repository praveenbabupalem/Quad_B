const { v4: uuidv4 } = require("uuid");
const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "user.db");

let db = null;

//DataBase initialization
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//login-API
app.post("/login", async (request, response) => {
  const { email, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE user_email = '${email}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbUser.user_password
    );
    if (isPasswordMatched === true) {
      const payload = {
        userEmail: email,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

//MiddleWare Function
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.userEmail = payload.userEmail;
        next();
      }
    });
  }
};

//API-1  details
app.get("/details/:userId", authenticateToken, async (request, response) => {
  const { userId } = request.params;
  const getUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      user_id = ?;`;
  const userDetails = await db.get(getUserQuery, [userId]);
  if (userDetails === undefined) {
    response.status(400);
    response.send("MisMatched Id");
  } else {
    response.send(userDetails);
  }
});

//API-2 update
app.put("/update", authenticateToken, async (request, response) => {
  const userEmail = request.userEmail;
  const { username, userImage, totalOrders } = request.body;
  const updateQuery = `
    UPDATE
      user
    SET
      user_name='${username}',
      user_image='${userImage}',
      total_orders='${totalOrders}'
    WHERE
      user_email = '${userEmail}';`;
  await db.run(updateQuery);
  response.send("Updated Successfully");
});

//API-3 image
app.get("/image/:userId", authenticateToken, async (request, response) => {
  const { userId } = request.params;
  const getUserQuery = `
    SELECT
      user_image
    FROM
      user
    WHERE
      user_id = ?;`;
  const userDetails = await db.get(getUserQuery, [userId]);
  if (userDetails === undefined) {
    response.status(400);
    response.send("MisMatched Id");
  } else {
    response.send(userDetails);
  }
});

//API-4 insert
app.post("/insert", async (request, response) => {
  const { username, email, userImage, totalOrders } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE user_email = '${email}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO 
          user (user_id,user_name, user_email, user_password,user_image,total_orders) 
        VALUES 
          ('${uuidv4()}', 
            '${username}', 
            '${email}',
            '${hashedPassword}',
            '${userImage}',
            '${totalOrders}'
          )`;
    await db.run(createUserQuery);
    response.send("Register Successfully");
  } else {
    response.status = 400;
    response.send("User email already exists");
  }
});

//API-5 delete
app.delete("/delete/:userId", async (request, response) => {
  const { userId } = request.params;
  const getUserQuery = `
    SELECT
      user_image
    FROM
      user
    WHERE
      user_id = ?;`;
  const userDetails = await db.get(getUserQuery, [userId]);
  if (userDetails === undefined) {
    response.status(400);
    response.send("MisMatched Id");
  } else {
    const deleteQuery = `
    DELETE FROM
      user
    WHERE
      user_id = '${userId}';`;
    await db.run(deleteQuery);
    response.send("Deleted Successfully");
  }
});

//Get all users in the database
app.get("/detail", authenticateToken, async (request, response) => {
  const getUserQuery = `
            SELECT
              *
            FROM
             user`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});
