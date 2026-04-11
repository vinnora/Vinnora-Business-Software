import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmEmployee extends Document {
  userId: string;
  orgId?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  address?: { street?: string; city?: string; state?: string; country?: string; postalCode?: string };
  department: string;
  designation: string;
  reportingTo?: string;
  reportingToName?: string;
  employmentType: string;
  status: string;
  joinDate: Date;
  confirmationDate?: Date;
  exitDate?: Date;
  exitReason?: string;
  salary?: number;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
  pan?: string;
  aadhaar?: string;
  uan?: string;
  pfNumber?: string;
  esiNumber?: string;
  photoUrl?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const HrmEmployeeSchema = new Schema<IHrmEmployee>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    employeeId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
    nationality: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    reportingTo: { type: String },
    reportingToName: { type: String },
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation'],
      default: 'Full-Time',
    },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Notice Period', 'Terminated', 'Resigned'],
      default: 'Active',
    },
    joinDate: { type: Date, required: true },
    confirmationDate: { type: Date },
    exitDate: { type: Date },
    exitReason: { type: String },
    salary: { type: Number },
    bankName: { type: String },
    bankAccount: { type: String },
    ifsc: { type: String },
    pan: { type: String },
    aadhaar: { type: String },
    uan: { type: String },
    pfNumber: { type: String },
    esiNumber: { type: String },
    photoUrl: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

HrmEmployeeSchema.index({ userId: 1, employeeId: 1 }, { unique: true });
HrmEmployeeSchema.index({ userId: 1, email: 1 });

export default mongoose.models.HrmEmployee ||
  mongoose.model<IHrmEmployee>('HrmEmployee', HrmEmployeeSchema);
