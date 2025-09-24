export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
}

export interface UpdateUserRequest {
    username?: string;
    email?: string;
    password?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface UserResponse {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}