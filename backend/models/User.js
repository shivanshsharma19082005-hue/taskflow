const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['mainboss', 'admin', 'employee'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'employee' },
    // The user who created/manages this account.
    // - mainboss: null
    // - admin: the mainboss's id
    // - employee: the admin's id who created them
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    department: { type: String, default: 'General' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    manager: this.manager,
    department: this.department,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
