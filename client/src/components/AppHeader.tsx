import AddIcon from "@mui/icons-material/Add";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

interface AppHeaderProps {
  onOpenCreate: () => void;
}

export function AppHeader({ onOpenCreate }: AppHeaderProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
        <Toolbar disableGutters sx={{ minHeight: 56, gap: 2 }}>
          <Typography variant="h1" component="h1" sx={{ flexGrow: 1 }}>
            Team tasks
          </Typography>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddIcon fontSize="small" />}
            data-testid="open-create"
            onClick={onOpenCreate}
          >
            New task
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}