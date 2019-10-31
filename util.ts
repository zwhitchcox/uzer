import bcrypt from 'bcrypt';

export const hashPassword = pass => bcrypt.hash(pass, 10)