import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmAttendance extends Document {
  userId: string;
  orgId?: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  hoursWorked?: number;
  status: string;
  shift?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HrmAttendanceSchema = new Schema<IHrmAttendance>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    hoursWorked: { type: Number },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Half Day', 'Late', 'On Leave', 'Holiday', 'Week Off'],
      default: 'Present',
    },
    shift: { type: String, default: 'General' },
    remarks: { type: String },
  },
  { timestamps: true }
);

HrmAttendanceSchema.index({ userId: 1, employeeId: 1, date: 1 });

export default mongoose.models.HrmAttendance ||
  mongoose.model<IHrmAttendance>('HrmAttendance', HrmAttendanceSchema);
