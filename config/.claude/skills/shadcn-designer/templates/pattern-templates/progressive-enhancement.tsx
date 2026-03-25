// Progressive Enhancement Pattern
// {{description}}

// 1. Semantic HTML foundation
const FormComponent = () => (
  <form
    action="/submit"
    method="post"
    onSubmit={handleSubmit}
    noValidate
  >
    <label htmlFor="email">Email Address</label>
    <input
      type="email"
      id="email"
      name="email"
      required
      aria-describedby="email-error"
    />
    <div id="email-error" role="alert"></div>

    <button type="submit">Subscribe</button>
  </form>
);

// 2. JavaScript enhancement
const EnhancedForm = () => {
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    // Enhanced validation logic
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Enhanced submission with validation
    if (validateEmail(formData.email)) {
      // Submit with fetch API
      submitForm(formData);
    } else {
      setErrors({ email: 'Invalid email address' });
    }
  };

  return (
    <FormComponent onSubmit={handleSubmit} />
  );
};