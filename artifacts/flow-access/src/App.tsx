import { useEffect, type ComponentType } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { useGetCurrentUser, setAuthTokenGetter } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRef } from "react";

// Components
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import Plans from "./pages/plans";
import Usage from "./pages/usage";
import Admin from "./pages/admin";
import NotFound from "./pages/not-found";
import { Layout } from "./components/layout";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener((emission) => {
      const userId = emission?.user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Component />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: ComponentType }) {
  const { data: user, isLoading } = useGetCurrentUser();

  return (
    <>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
      <Show when="signed-in">
        <Layout>
          {isLoading ? null : user?.isAdmin ? (
            <Component />
          ) : (
            <Redirect to="/dashboard" />
          )}
        </Layout>
      </Show>
    </>
  );
}

function PublicRouteWithLayout({ component: Component }: { component: ComponentType }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to: string) => setLocation(stripBase(to))}
      routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}
      appearance={{
        layout: {
          socialButtonsVariant: "iconButton",
        },
        variables: {
          colorPrimary: "hsl(142.1 70.6% 45.3%)",
          colorBackground: "hsl(240 10% 3.9%)",
          colorInputBackground: "hsl(240 3.7% 15.9%)",
          colorInputText: "hsl(0 0% 98%)",
          colorText: "hsl(0 0% 98%)",
          colorTextSecondary: "hsl(240 5% 64.9%)",
        },
        elements: {
          card: "bg-card text-card-foreground border border-border shadow-md",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton: "border-border hover:bg-accent hover:text-accent-foreground",
          dividerLine: "bg-border",
          dividerText: "text-muted-foreground",
          formFieldLabel: "text-foreground",
          formFieldInput: "bg-input border-border text-foreground focus:ring-primary",
          footerActionText: "text-muted-foreground",
          footerActionLink: "text-primary hover:text-primary/90",
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkAuthBridge />
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
          <Route path="/plans" component={() => <PublicRouteWithLayout component={Plans} />} />
          <Route path="/usage" component={() => <ProtectedRoute component={Usage} />} />
          <Route path="/admin" component={() => <AdminRoute component={Admin} />} />
          <Route component={() => <Layout><NotFound /></Layout>} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
