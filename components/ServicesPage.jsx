import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ChevronRight, 
  FileCheck, 
  BarChart4, 
  GraduationCap, 
  Leaf, 
  Building, 
  Users, 
  PenTool,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  X
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import SEOHead from './SEOHead';
import axios from 'axios';

// Simplified Service Card Component
const ServiceCard = ({ icon, title, description, category }) => (
  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4 flex flex-col h-full border border-transparent hover:border-emerald-200">
    <div className="flex items-center mb-3">
      <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg mr-2">
        {icon}
      </div>
      <h3 className="font-medium text-emerald-800">{title}</h3>
    </div>
    <p className="text-sm text-gray-600 mb-3 flex-grow">{description}</p>
    <div className="mt-auto pt-2 flex items-center justify-between">
      <span className="inline-block bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full">
        {category}
      </span>
    
    </div>
  </div>
);

// Streamlined Featured Service Component
const FeaturedService = ({ title, description, icon, features }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
    <div className="bg-emerald-700 text-white p-3 md:p-0 md:w-1/4 md:flex md:items-center md:justify-center">
      <div className="flex items-center md:flex-col md:text-center">
        <div className="bg-white text-emerald-700 p-2 rounded-full mr-3 md:mr-0 md:mb-2 md:mt-6">
          {icon}
        </div>
        <h3 className="font-semibold md:pb-6 md:px-2">{title}</h3>
      </div>
    </div>
    <div className="p-4 md:w-3/4">
      <p className="text-gray-600 mb-3 text-sm">{description}</p>
      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start">
            <div className="text-emerald-600 mt-1 mr-2">
              <FileCheck size={14} />
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-800">{feature.title}</h4>
              <p className="text-xs text-gray-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center transition-colors">
        Learn more <ArrowRight size={14} className="ml-1" />
      </button>
    </div>
  </div>
);

// Project Card Component — clean with image padding and hover lift
const ProjectCard = ({ title, description, image, onClick, featured }) => {
  if (featured) {
    return (
      <div 
        className="group cursor-pointer bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg overflow-hidden"
        onClick={onClick}
      >
        <div className="flex flex-col md:flex-row">
          <div className="md:w-3/5 p-4">
            <div className="overflow-hidden rounded-xl h-full">
              <img 
                src={image || "/api/placeholder/600/400"} 
                alt={title}
                className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
          </div>
          <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-center">
            <span className="inline-block text-xs font-semibold tracking-wider text-emerald-600 uppercase mb-3">Featured Project</span>
            <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-emerald-700 transition-colors">{title}</h3>
            {description && <p className="text-gray-500 leading-relaxed mb-4">{description}</p>}
            <span className="inline-flex items-center text-sm font-medium text-emerald-600 group-hover:gap-2 gap-1 transition-all">
              View details
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group cursor-pointer bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden"
      onClick={onClick}
    >
      <div className="p-3">
        <div className="overflow-hidden rounded-xl">
          <img 
            src={image || "/api/placeholder/400/300"} 
            alt={title}
            className="w-full aspect-[4/3] object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
      </div>
      <div className="px-4 pb-4 pt-1">
        <h4 className="font-semibold text-gray-900 leading-snug group-hover:text-emerald-700 transition-colors">{title}</h4>
        {description && <p className="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-2">{description}</p>}
        <div className="mt-3 flex items-center text-sm font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
          View details
          <ArrowRight size={14} className="ml-1" />
        </div>
      </div>
    </div>
  );
};

// Improved Project Modal Component
const ProjectModal = ({ project, onClose }) => {
  if (!project) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-[scaleIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
          <h3 className="font-bold text-lg text-gray-900 pr-4">{project.title}</h3>
          <button 
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Hero Image */}
          <div className="aspect-[16/9] mb-6 bg-gray-100 rounded-xl overflow-hidden shadow-sm">
            <img 
              src={project.image || "/api/placeholder/800/400"} 
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Overview */}
          {project.description && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-1 rounded-full bg-emerald-500" />
                <h4 className="font-semibold text-gray-900">Overview</h4>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 pl-3">{project.description}</p>
            </div>
          )}
          
          {/* Details */}
          {project.details && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-1 rounded-full bg-emerald-500" />
                <h4 className="font-semibold text-gray-900">About This Project</h4>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 pl-3">{project.details}</p>
            </div>
          )}
          
          {/* Results */}
          {project.results && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-1 rounded-full bg-emerald-500" />
                <h4 className="font-semibold text-gray-900">Impact & Results</h4>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 pl-3">{project.results}</p>
            </div>
          )}
          
          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {project.tags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Gallery */}
          {project.gallery && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-1 rounded-full bg-emerald-500" />
                <h4 className="font-semibold text-gray-900">Gallery</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {project.gallery.map((img, idx) => (
                  <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={img || "/api/placeholder/200/150"} 
                      alt={`Gallery ${idx+1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Compact Image Carousel Component
const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  return (
    <div className="relative rounded-lg overflow-hidden max-w-4xl mx-auto">
      <div className="aspect-[21/9] bg-gray-100">
        <img 
          src={images[currentIndex] || "/api/placeholder/800/450"} 
          alt="Featured project" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <button 
          onClick={handlePrev}
          className="bg-white/80 hover:bg-white text-emerald-800 p-1.5 rounded-full"
          aria-label="Previous image"
        >
          <ArrowLeft size={16} />
        </button>
        <button 
          onClick={handleNext}
          className="bg-white/80 hover:bg-white text-emerald-800 p-1.5 rounded-full"
          aria-label="Next image"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <div className="flex space-x-1">
          {images.map((_, idx) => (
            <button 
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Compact Filter Pill Component
const FilterPill = ({ label, active, onClick }) => (
  <button
    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
      active 
        ? 'bg-emerald-600 text-white' 
        : 'bg-white text-gray-600 hover:bg-gray-100'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

// Main Services Page Component
const ServicesPage = () => {
  const [activeTab, setActiveTab] = useState('work');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const servicesRef = useRef(null);
  const portfolioRef = useRef(null);

  const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.PROD) return '';
    return 'http://localhost:5001';
  };

  // Icon mapping for dynamic services
  const iconMap = {
    BarChart4: <BarChart4 size={18} />,
    GraduationCap: <GraduationCap size={18} />,
    Leaf: <Leaf size={18} />,
    Building: <Building size={18} />,
    Users: <Users size={18} />,
    PenTool: <PenTool size={18} />,
    FileCheck: <FileCheck size={18} />,
  };
  
  // ── Hardcoded fallback data ──
  const fallbackServices = [
    { id: 1, title: 'Workshops & Seminars on Climate Change, Plastic Pollution, Biodiversity, etc.', description: 'As Planet Warriors, we conduct engaging workshops and seminars on key environmental issues like climate change, plastic pollution, and biodiversity loss.', icon: 'BarChart4' },
    { id: 2, title: 'Eco-Education Programs in schools and colleges', description: 'Eco-Education Programs in schools and colleges aim to instill environmental awareness, responsibility, and sustainable practices among students.', icon: 'GraduationCap' },
    { id: 3, title: 'Waste Management & Recycling Services', description: 'Our Waste Management & Recycling Services focus on promoting responsible waste disposal and resource recovery.', icon: 'Leaf' },
    { id: 4, title: 'Plastic-Free Lifestyle Tips', description: 'Adopting a plastic-free lifestyle starts with simple swaps: use cloth bags, carry a reusable water bottle and cutlery.', icon: 'Building' },
    { id: 5, title: 'Zero-Waste Event Planning', description: 'Zero-Waste Event Planning focuses on organizing eco-friendly weddings and events that minimize environmental impact.', icon: 'Users' },
    { id: 6, title: 'Urban Farming and Terrace Gardening Consultation', description: 'Our Urban Gardening and Terrace Farming consultancy empowers individuals and communities to grow their own food.', icon: 'PenTool' },
    { id: 7, title: 'Our Sustainable Menstruation Awareness services', description: 'Our Sustainable Menstruation Awareness services educate individuals on eco-friendly menstrual choices.', icon: 'PenTool' },
  ];

  const fallbackProjects = [
    { id: 1, title: 'Empowering Education: Gifting School Essentials', details: 'We support schools by gifting essential school supplies and stationery.', image: '/WhatsApp Image 2025-07-26 at 5.54.59 PM.jpeg', tags: [] },
    { id: 2, title: 'Water Pots for Street Animals', details: 'We have initiated the Water Pots for Street Animals campaign in Greater Noida.', image: '/WhatsApp Image 2025-07-26 at 5.54.18 PM.jpeg', tags: [] },
    { id: 3, title: 'Feeding Street Animals', details: 'We actively feed street animals, ensuring they receive regular, nutritious meals.', image: '/WhatsApp Image 2025-07-26 at 5.55.08 PM.jpeg', tags: [] },
    { id: 4, title: 'Treatment to Street Animals', details: 'We provide vaccinations to street animals to protect them from deadly diseases.', image: '/WhatsApp Image 2025-07-26 at 5.55.05 PM.jpeg', tags: [] },
    { id: 5, title: 'Reducing Textile Waste', details: 'We upcycle boutique waste into useful products like bags, accessories, and home décor items.', image: '/WhatsApp Image 2025-07-26 at 5.55.01 PM.jpeg', tags: [] },
    { id: 6, title: 'Bioenzyme and Seed Ball Making Workshops', details: 'We conducted Bioenzyme and Seed Ball Making Workshops in college.', image: '/WhatsApp Image 2025-07-26 at 5.54.39 PM.jpeg', tags: [] },
    { id: 7, title: 'Supporting and Uplifting Lives in Old Age Homes', details: 'We support old age homes by providing essential supplies and spending quality time.', image: '/WhatsApp Image 2025-07-26 at 5.55.03 PM.jpeg', tags: [] },
  ];

  // ── Dynamic data state ──
  const [services, setServices] = useState(fallbackServices);
  const [projects, setProjects] = useState(fallbackProjects);

  // ── Fetch from API ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, wRes] = await Promise.all([
          axios.get(getApiUrl() + '/api/services', { timeout: 8000 }).catch(() => null),
          axios.get(getApiUrl() + '/api/work', { timeout: 8000 }).catch(() => null),
        ]);
        if (sRes?.data?.length > 0) {
          setServices(sRes.data.map((s, i) => ({
            id: s._id || i + 1,
            title: s.title,
            description: s.description,
            icon: s.icon || 'Leaf',
          })));
        }
        if (wRes?.data?.length > 0) {
          setProjects(wRes.data.map((w, i) => ({
            id: w._id || i + 1,
            title: w.title,
            description: w.description || '',
            details: w.details || '',
            results: w.results || '',
            image: w.image || '',
            gallery: w.gallery || [],
            tags: w.tags || [],
          })));
        }
      } catch {
        // Use fallback data on error
      }
    };
    fetchData();
  }, []);

  // Service Categories
  const serviceCategories = [
    { id: 'all', name: 'All Services' },
  ];

  // Project Categories  
  const projectCategories = [];

  // Carousel images
  const featuredImages = [
    "https://images.unsplash.com/photo-1586618812060-54a6fedc132c?q=80&w=2969&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1614650394712-3377ac03e9cb?q=80&w=3174&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  ];

  // Featured Services Data
  const featuredServices = [
    {
      title: 'Empowering Education: Gifting School Essentials',
      description: 'We support schools by gifting essential school supplies and stationery.',
      icon: <BarChart4 size={20} />,
      features: [
        { title: 'Waste Audit & Analysis', description: 'Assessment of current waste patterns and opportunities.' },
        { title: 'System Implementation', description: 'Custom waste management infrastructure for your needs.' },
        { title: 'Community Engagement', description: 'Educational programs to ensure high participation.' },
      ],
    },
    {
      title: 'Environmental Education',
      description: 'Specialized programs designed for schools, communities, and corporations to foster awareness.',
      icon: <GraduationCap size={20} />,
      features: [
        { title: 'Interactive Workshops', description: 'Engaging learning experiences for all ages.' },
        { title: 'Custom Learning Materials', description: 'Age-appropriate resources for your audience.' },
        { title: 'Ongoing Support', description: 'Continuous guidance and impact measurement.' },
      ],
    },
  ];

  // Filter services based on search term
  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
    const matchesSearch = 
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter projects based on category
  const filteredProjects = projects.filter((project) => {
    return activeCategory === 'all' || project.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Our Services & Portfolio | Nisargmaitri"
        description="Explore Nisargmaitri's eco-services: workshops on climate change, waste management consulting, zero-waste event planning, urban farming guidance & more."
        path="/services"
      />
      {/* Navbar Component */}
      <Navbar />

      {/* Header Section */}
      <header className="bg-emerald-800 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold mb-2 text-center">Our Services & Portfolio</h1>
          <p className="text-emerald-100 text-center max-w-lg mx-auto text-sm">
            Sustainable solutions for communities and organizations
          </p>
          
          {/* Simplified Tab Selection */}
          <div className="flex justify-center mt-6">
            <div className="inline-flex rounded-lg overflow-hidden bg-emerald-700">
              <button
                className={`px-4 py-2 text-sm font-medium relative
                  ${activeTab === 'services' ? 'bg-white text-emerald-800' : 'text-white hover:bg-emerald-600'}`}
                onClick={() => {
                  setActiveTab('services');
                  setTimeout(() => scrollToSection(servicesRef), 100);
                }}
              >
                Services
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium relative
                  ${activeTab === 'work' ? 'bg-white text-emerald-800' : 'text-white hover:bg-emerald-600'}`}
                onClick={() => {
                  setActiveTab('work');
                  setTimeout(() => scrollToSection(portfolioRef), 100);
                }}
              >
                Our Work
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Smaller Image Carousel */}
      <section className="py-4">
        <div className="container mx-auto px-4">
          <ImageCarousel images={featuredImages} />
        </div>
      </section>

      {/* Services Section */}
      <section ref={servicesRef} className={`py-8 ${activeTab === 'services' ? 'block' : 'hidden'}`}>
        <div className="container mx-auto px-4">
          <h2 className="text-lg font-bold mb-1 text-emerald-800">
            Our Works
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            We provide a range of environmental services to help communities and organizations achieve sustainability goals.
          </p>
          
          {/* Featured Services */}
          <div className="mb-8">
           
        
          </div>
          
          {/* All Services with Search and Filters */}
          <div>
          
            
            <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-64">
             
                <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                  
                </div>
              </div>
              
              <div className="flex overflow-x-auto gap-2 w-full md:w-auto no-scrollbar pb-1">
             
              </div>
            </div>
            
            {/* Service Cards Grid */}
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    icon={iconMap[service.icon] || <Leaf size={18} />}
                    title={service.title}
                    description={service.description}
                    category={serviceCategories.find(cat => cat.id === service.category)?.name || ''}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <Search size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 font-medium">No services found</p>
                <p className="text-gray-400 text-xs">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Portfolio/Projects Section */}
      <section ref={portfolioRef} className={`py-14 bg-gray-50 ${activeTab === 'work' ? 'block' : 'hidden'}`}>
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Section Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Our Work
              </h2>
              <p className="text-gray-500 mt-1">
                Making a real difference through action
              </p>
            </div>
            <span className="hidden sm:block text-sm text-gray-400">{filteredProjects.length} projects</span>
          </div>
          
          {/* Project Filters */}
          {projectCategories.length > 0 && (
            <div className="mb-8 flex">
              <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                {projectCategories.map((category) => (
                  <FilterPill
                    key={category.id}
                    label={category.name}
                    active={activeCategory === category.id}
                    onClick={() => setActiveCategory(category.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Project (first one) */}
          {filteredProjects.length > 0 && (
            <div className="mb-8">
              <ProjectCard
                title={filteredProjects[0].title}
                description={filteredProjects[0].details || filteredProjects[0].description}
                tags={filteredProjects[0].tags}
                image={filteredProjects[0].image}
                onClick={() => setSelectedProject(filteredProjects[0])}
                featured={true}
              />
            </div>
          )}
          
          {/* Remaining Projects Grid */}
          {filteredProjects.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.slice(1).map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  description={project.description}
                  tags={project.tags}
                  image={project.image}
                  onClick={() => setSelectedProject(project)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectModal 
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default ServicesPage;