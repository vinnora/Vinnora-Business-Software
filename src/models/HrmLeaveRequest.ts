import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmLeaveRequest extends Document {
  userId: string;
  orgId?: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason?: string;
  status: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HrmLeaveRequestSchema = new Schema<IHrmLeaveRequest>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    leaveType: {
      type: String,
      enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity', 'Paternity', 'Compensatory', 'Unpaid', 'Other'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    approvedBy: { type: String },
    approvedByName: { type: String },
    approvedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.HrmLeaveRequest ||
  mongoose.model<IHrmLeaveRequest>('HrmLeaveRequest', HrmLeaveRequestSchema);
