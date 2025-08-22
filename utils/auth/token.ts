import jwt, { JwtPayload, Secret } from "jsonwebtoken";

export interface UserPayload {
  _id: string;
  role: string;
  user_id?: string;   
  fullName?: string;  
}



interface EmployeePayload {
  _id: string;
  employeeName: string;
  role?: string;
}

export const generateAccessToken = (user: UserPayload): string => {
  return jwt.sign(
    {_id: user._id, user_name: user.fullName, role: user.role ?? "admin" },
    process.env.JWT_SECRET as Secret,
    { expiresIn: "1h" }
  );
};

export const generateRefreshToken = (user: UserPayload): string => {
  return jwt.sign(
    { user_id: user._id, user_name: user.fullName, role: user.role ?? "admin" },
    process.env.JWT_REFRESH_SECRET as Secret,
    { expiresIn: "7d" }
  );
};


export const generateAccessManagerToken = (employee: EmployeePayload): string => {
  return jwt.sign(
    {
      name: employee.employeeName,
      id: employee._id,
      role: employee.role ?? "manager",
    },
    process.env.JWT_SECRET as Secret,
    { expiresIn: "1h" }
  );
};
export const generateRefreshManagerToken = (employee: EmployeePayload): string => {
  return jwt.sign(
    { employeeId: employee._id },
    process.env.REFRESH_TOKEN_SECRET as Secret,
    { expiresIn: "7d" }
  );
};
