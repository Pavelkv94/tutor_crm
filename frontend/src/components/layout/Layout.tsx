import "./Layout.styles.scss"
import Typography from "@mui/material/Typography"

const Layout = ({ children, dialog, title }: { children: React.ReactNode, dialog: React.ReactNode, title: string }) => {
	return (
		<div className="layout">
			<div className="layout-header">
				<Typography variant="h5" fontWeight="bold">{title}</Typography>
				{dialog}
			</div>
			{children}
		</div>

	)
}

export default Layout