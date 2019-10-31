import { test, before, /*describe, after, afterEach, beforeEach*/ } from 'tezt'
import { Uzer } from './lib.sqlite';
import expect from "expect"
import bcrypt from "bcrypt"

const sampleUser = {
  email: "zwhitchcox@gmail.com",
  password: "MyPassword@01"
}

const uzer = Uzer({
  tableName: "mytable"
})

before(async () => await uzer.init())

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

test("delete user", async () => {
  expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail}])
  await uzer.deleteUser(alteredEmail)
  expect(await uzer.getAllUsers()).toEqual([])
})