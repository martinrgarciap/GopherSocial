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
      redirect("/app");
    } else {
      // handle error
      alert("We could not confirm this account.");
    }
  };

  return (
    <section className="content-panel">
      <h1>Confirm your account</h1>
      <p>Finish setting up your profile to start using GopherSocial.</p>
      <button onClick={handleConfirm}>Click to confirm</button>
      <Link className="secondary-link" to="/app">
        Back to GopherSocial
      </Link>
    </section>
  );
};
