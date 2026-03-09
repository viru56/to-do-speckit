export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateTodoInput {
  text: string;
}

export interface UpdateTodoInput {
  completed: boolean;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}
