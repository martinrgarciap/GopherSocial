import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.tsx";
import { ConfirmationPage } from "./ConfirmationPage.tsx";
import LandingPage from "./LandingPage.tsx";
import {
  CreatePostPage,
  EditPostPage,
  FeedPage,
  FollowingPage,
  HomePage,
  LoginPage,
  PostDetailPage,
  RegisterPage,
  UserProfilePage,
} from "./pages.tsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    element: <App />,
    children: [
      {
        path: "app",
        element: <HomePage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "feed",
        element: <FeedPage />,
      },
      {
        path: "following",
        element: <FollowingPage />,
      },
      {
        path: "create",
        element: <CreatePostPage />,
      },
      {
        path: "users/:userID",
        element: <UserProfilePage />,
      },
      {
        path: "posts/:postID",
        element: <PostDetailPage />,
      },
      {
        path: "posts/:postID/edit",
        element: <EditPostPage />,
      },
    ],
  },
  {
    path: "/confirm/:token",
    element: <ConfirmationPage />,
  },
  {
    path: "/confim/:token",
    element: <ConfirmationPage />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
