'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginRequest } from '../../models/user';
import Style from './page.module.css';

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        // Store token in localStorage or cookies
        localStorage.setItem('token', data.token);
        // Navigate to main page
        router.push('/main');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password click
  const handleForgotPasswordClick = () => {
    router.push('/forgot-password');
  };

  return (
    <div className={Style.loginPage}>
      <div className={Style.loginContainer}>
        <h1>Login</h1>
        
        <form className={Style.loginForm} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email:</label>
            <input
              type="string"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <div>
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        
        <div className={Style.actions}>
          <button className={Style.linkButton} type="button" onClick={handleForgotPasswordClick}>
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}