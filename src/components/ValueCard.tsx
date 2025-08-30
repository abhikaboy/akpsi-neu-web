import { Card, CardContent } from './ui/card'

interface ValueCardProps {
  title: string;
  description: string;
  backgroundImage: string;
  textColor?: 'white' | 'black';
  icon?: React.ReactNode;
}

export default function ValueCard({ 
  title, 
  description, 
  backgroundImage, 
  textColor = 'black',
  icon 
}: ValueCardProps) {
  return (
    <Card 
      className="bg-center bg-cover bg-no-repeat p-8 relative h-[400px] sm:h-[450px] lg:h-[495px] w-full max-w-[427px] transition-transform duration-300 hover:scale-105 border-0 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.2)]"
      style={{ backgroundImage: `url('${backgroundImage}')` }}
    >
      {/* Black gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 100%)'
        }}
      />
      
      <CardContent className="flex flex-col gap-6 h-full items-start justify-end overflow-hidden pb-6 pl-6 pr-8 pt-[115px] relative w-full p-0 z-10">
        <div className="flex flex-col gap-2 items-start justify-start relative w-full">
          <div className={`flex flex-col gap-6 items-start justify-start relative w-full ${textColor === 'white' ? 'text-white' : 'text-black'}`}>
            <h3 className="font-['PP_Editorial_New'] text-2xl font-normal leading-none" style={{ letterSpacing: '-2%' }}>
              {title}
            </h3>
            <p className="font-['Avenir:Roman'] text-base leading-[20px] w-full">
              {description}
            </p>
          </div>
          {icon && (
            <div className="relative w-8 h-8">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
