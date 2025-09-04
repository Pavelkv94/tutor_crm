import Backdrop from '@mui/material/Backdrop'
import preloader from '../../assets/1200x1200.gif';

const Preloader = ({ isLoading }: { isLoading: boolean }) => {
	return <Backdrop
		sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1, backgroundColor: 'rgba(193, 215, 248, 0.5)' })}
		open={isLoading}
	>
<img src={preloader} alt="preloader" width={500} height={500} />
	</Backdrop>
}

export default Preloader