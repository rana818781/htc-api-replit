import { type ComponentType } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import Plans from "./pages/plans";
import Usage from "./pages/usage";
import Admin from "./pages/admin";
import AdminAddSession from "./pages/admin-add-session";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth";
import { Layout } from "./components/layout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Home />;
}

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AdminRoute({ component: Component }: { component: ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading } = useGetCurrentUser();

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (!user?.isAdmin) return <Redirect to="/dashboard" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function PublicRouteWithLayout({ component: Component }: { component: ComponentType }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function SignInRedirectIfAuthed() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <AuthPage defaultTab="login" />;
}

function SignUpRedirectIfAuthed() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <AuthPage defaultTab="signup" />;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in" component={SignInRedirectIfAuthed} />
        <Route path="/sign-up" component={SignUpRedirectIfAuthed} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/plans" component={() => <PublicRouteWithLayout component={Plans} />} />
        <Route path="/usage" component={() => <ProtectedRoute component={Usage} />} />
        <Route path="/admin/sessions/new" component={() => <AdminRoute component={AdminAddSession} />} />
        <Route path="/admin" component={() => <AdminRoute component={Admin} />} />
        <Route component={() => <Layout><NotFound /></Layout>} />
      </Switch>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
