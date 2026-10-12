
import LandingLayout from "@/components/Layouts/LandingLayout";
import LandingHome from "@/components/home/landingHome";
import "@/css/style.css";
import 'leaflet/dist/leaflet.css';



export default function Home() {
  return (
    <>
       <LandingLayout>
        <LandingHome/>
      </LandingLayout> 
   
    </>
  );
}
