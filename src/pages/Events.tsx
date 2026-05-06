import { Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function Events() {
  const events = [
    {
      id: 1,
      title: 'Annual Sports Day',
      date: '15th Falgun, 2081',
      description: 'Join us for a day of athletic excellence and sportsmanship.',
      image: 'https://picsum.photos/seed/sports/800/500',
      type: 'image'
    },
    {
      id: 2,
      title: 'Science Exhibition',
      date: '10th Chaitra, 2081',
      description: 'Explore innovative science projects and experiments.',
      image: 'https://picsum.photos/seed/sciencefair/800/500',
      type: 'image'
    },
    {
      id: 3,
      title: 'Cultural Program Highlights',
      date: 'Previous Month',
      description: 'A beautiful showcase of our rich cultural heritage.',
      image: 'https://picsum.photos/seed/cultural/800/500',
      type: 'video-placeholder'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="md:col-span-2 flex flex-col gap-5">
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4">School Events</div>
          <div className="flex flex-col gap-4">
            {events.map((event, index) => (
              <motion.div 
                key={event.id} 
                className="flex gap-4 p-3 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="w-24 h-24 shrink-0 rounded overflow-hidden relative">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {event.type === 'video-placeholder' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-t-4 border-t-transparent border-l-[8px] border-l-[#1f2937] border-b-4 border-b-transparent ml-0.5"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-primary text-[0.65rem] font-bold uppercase mb-1">
                    <Calendar className="h-3 w-3" />
                    {event.date}
                  </div>
                  <h3 className="text-sm font-bold text-[#1f2937] mb-1">{event.title}</h3>
                  <p className="text-xs text-[#6b7280] line-clamp-2">{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <div className="md:col-span-1">
        <section className="bg-[#1e293b] text-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full">
          <div>
            <div className="text-[0.75rem] font-bold uppercase text-white/60 mb-4">Campus Contact</div>
            <p className="text-[0.9rem] font-bold mb-1">Shikshantar Academy</p>
            <p className="text-[0.75rem] opacity-70 mb-4 flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Bastipur-5, Siraha
            </p>
            <div className="space-y-2">
              <p className="text-[0.75rem] opacity-70 flex items-center gap-2">
                <Phone className="h-3 w-3" /> +977 033-XXXXXX
              </p>
              <p className="text-[0.75rem] opacity-70 flex items-center gap-2">
                <Mail className="h-3 w-3" /> info@shikshantar.edu.np
              </p>
            </div>
          </div>
          <button className="w-full bg-primary text-white border-none py-2 px-3 rounded-md text-[0.8rem] font-medium cursor-pointer mt-6">
            Open School Location (Maps)
          </button>
        </section>
      </div>
    </div>
  );
}
