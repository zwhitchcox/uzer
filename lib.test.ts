import { test, before, after, /*describe, afterEach, beforeEach*/ } from 'tezt'
import { SqliteUzer, PostgresUzer } from './lib';
import expect from "expect"
import bcrypt from "bcrypt"

const sampleUser = {
  email: "zwhitchcox@gmail.com",
  password: "MyPassword@01"
}

const sqliteUzer = SqliteUzer({
  tableName: "mytable"
})

const postgresUzer = PostgresUzer({
  tableName: "mytable",
  db: {
    host: 'localhost',
    user: 'postgres',
    database: 'uzertest',
    password: 'password',
    port: 5432,
  }
})

before(async () => {
  await sqliteUzer.init()
  await postgresUzer.init()
})

after(async () => {
  await sqliteUzer.close()
  await postgresUzer.close()
})

const runBoth = fn => {
  fn(sqliteUzer)
  fn(postgresUzer)
}

runBoth(uzer => {
  test("create user", async () => {
    expect(() => uzer.createUser({
      email: "asdf@asdf.com"
    }))
    await uzer.createUser(sampleUser)
    const {password, ...sampleUserNoPassword} = sampleUser
    const {password:hashedPass, ...gottenUser} = await uzer.getUser(sampleUser.email)
    expect(gottenUser).toMatchObject(sampleUserNoPassword as any)
    expect(await bcrypt.compare(sampleUser.password, hashedPass)).toBe(true)
  })

  test("check user credentials", async () => {
    const {email, password:correctPass} = sampleUser
    await uzer.authenticateUser({email, password: correctPass})

    const incorrectPass = "veqwerqteagkjd"
    await expect(uzer.authenticateUser({email, password: incorrectPass})).rejects.toThrow()
  })

  const alteredEmail = "zanehitchcox@gmail.com"
  test("update user email", async () => {
    await uzer.updateUserEmail(sampleUser.email, alteredEmail)
    expect(await uzer.getUser(alteredEmail)).toBeTruthy()
  })

  test("update user password", async () => {
    const newPassword = "MyNewPassword@01"
    const newUser = {
      email: alteredEmail,
      password: newPassword,
    }
    await uzer.updateUserPassword(newUser)
    await uzer.authenticateUser(newUser)
    await expect(uzer.authenticateUser({email: alteredEmail, password: "incorrectPassword"}))
      .rejects.toThrow()
  })

  const FIFTEEN_MINUTES = 1000 * 60 * 15
  const resetPassword = "ResetPassword@01"
  test("reset password token", async () => {
    const passwordResetToken = await uzer.createPasswordResetToken({
      email: alteredEmail,
      expiration: Date.now() + FIFTEEN_MINUTES
    })

    await uzer.resetPasswordByToken({
      email: alteredEmail,
      token: passwordResetToken,
      password: resetPassword,
    })

    const user = await uzer.getUser(alteredEmail)
    expect(await bcrypt.compare(resetPassword, user.password)).toBe(true)
  })

  test("delete user", async () => {
    expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail}])
    await uzer.deleteUser(alteredEmail)
    expect(await uzer.getAllUsers()).toEqual([])
  })
})
