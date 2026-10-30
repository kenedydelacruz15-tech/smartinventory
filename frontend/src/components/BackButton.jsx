import { useNavigate } from "react-router-dom";

export default function BackButton({ fallback = "/dashboard", label = "Back" }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  };
  return (
    <button type="button" className="back-link" onClick={goBack}>
      <i className="bi bi-arrow-left" /> {label}
    </button>
  );
}
