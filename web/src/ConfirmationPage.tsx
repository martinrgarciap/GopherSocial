import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "./App";

export const ConfirmationPage = () => {
  const { token = "" } = useParams();
  const redirect = useNavigate();

  const handleConfirm = async () => {
    const response = await fetch(`${API_URL}/users/activate/${token}`, {
      method: "PUT",
    });

    if (response.ok) {
      redirect("/");
    } else {
      // handle error
      alert("Failed to confirm token");
    }
  };

  return (
    <section className="content-panel">
      <h1>Confirmation</h1>
      <p>Confirm this account activation token.</p>
      <button onClick={handleConfirm}>Click to confirm</button>
      <Link className="secondary-link" to="/">
        Back home
      </Link>
    </section>
  );
};
