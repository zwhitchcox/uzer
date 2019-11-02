## uzer

`uzer` provides convenience functions for creating and authenticating users.

* rapidly add user authentication to your app
* uses `sqlite` or `postgres`
* only stores user `email` and `password`
* passwords hashed using `bcrypt`

### Installation

`yarn install --dev uzer`

`npm i -D uzer`

### Usage

Initialize the database providing the options:

##### Sqlite
```ts
import { SqliteUzer } from 'uzer'
import sqlite from 'sqlite'

;(async () => {
const uzer = new SqliteUzer({
  tableName: "users",
  validatePassword: password => {
    if (password.length < 10) {
      throw new Error("Password must be at least 10 characters")
    }
    if (!/[!@#$%^&*()].test(password)) {
      throw new Error("Password must contain symbols (!@#$%^&*())")
    }
  },
  sqlite: sqlite.open(":memory:"),
})

await uzer.init()

await uzer.createUser({
  email: "myemail@gmail.com",
  password: "Password123",
})
})()
```

##### Postgres
```ts
import { PostgresUzer } from 'uzer'
import { Pool } from 'pg'

;(async () => {
const uzer = Uzer({
  tableName: "mytable",
  pool: new Pool({
    host: 'localhost',
    user: 'postgres',
    database: 'mydb',
    password: 'password',
    port: 5432,
  })
})

await uzer.init()

await uzer.createUser({
  email: "myemail@gmail.com",
  password: "Password123",
})
})()
```

* `tableName`: the name you want for your users table. Defaults to `"users"`
  Note: This is useful if you want multiple types of users. For instance, you
  could have customers and employees. You could have a different user of each
  type with the same email address.
* `validatePassword`: function to use while creating/updating users' passwords
  Defaults to the `passwordValidator` function from [`validatorz`](https://npmjs.com/validatorz)
* `postgres`
  * `pool`: pool from the `[pg package](https://npmjs.com/pg)`
  * `sqlite`: sqlite db from the `[sqlite package](https://npmjs.com/sqlite)`

`Uzer` returns an object with several functions for manipulating/reading the user
authentication data. These are documented in the API section.

### API

All functions return a promise. Promise is rejected if there is an error.

* `init`
  * start the sqlite db
  * `() => undefined`
* `close`
  * close the sqlite db
  * `() => undefined`
* `createUser`
  * creates a user
  *`{email, password} => undefined`
* `authenticateUser`
  * promise rejects if given invalid credentials
  * `{email, password} => undefined`
* `getUser`
  * returns user's id, email, and hashed password
  * `(email) => {id, email, password}`
* `getAllUsers`
  * returns all users in database
  * `() => [{id, email, password}]`
* `updateUserEmail`
  * updates user's email
  * `(curEmail, newEmail) => undefined`
* `updateUserPassword`
  * updates user's password
  * `({email, password}) => undefined`
* `deleteUser`:
  * deletes user
  * `email => undefined`
* `createPasswordResetToken`
  * create a token which can be used to set a new password for password recovery
  * `email => passwordToken`
* `resetPasswordByToken`
  * use password from `createPasswordResetToken` to set the new password
  * `({email, password, token}) => undefined`
* `deactivateAccount`
  * sets user's `active` field to `false`
  * `({email, password}) => undefined`
* `reactivateAccount`
  * sets user's `active` field to `true`
  * `({email, password}) => undefined`
* `createEmailVerificationToken`
  * creates a token that can be sent to a user's email for verification
  * `email => token`
* `verifyEmailByToken`
  * uses token from `createEmailVerificationToken` to set user's `email_verified` status to `true`
  * `({email, token}) => undefined`