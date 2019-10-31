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
  db: "uzer.db",
})
```

##### Postgres
```ts
import { PostgresUzer } from 'uzer'

const uzer = Uzer({
  tableName: "mytable",
  db: {
    host: 'localhost',
    user: 'postgres',
    database: 'mydb',
    password: 'password',
    port: 5432,
  }
})
```

* `tableName`: the name you want for your users table. Defaults to `"users"`
  Note: This is useful if you want multiple types of users. For instance, you
  could have customers and employees. You could have a different user of each
  type with the same email address.
* `validatePassword`: function to use while creating/updating users' passwords
  Defaults to the `passwordValidator` function from [`validatorz`](https://npmjs.com/validatorz)
* `db`:
  * `postgres`: info on the database for connection
  * `sqlite`: file to store the sqlite database. defaults to `":memory:"`

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
  * `(email) => undefined`