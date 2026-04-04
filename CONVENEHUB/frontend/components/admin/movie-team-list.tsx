'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/convene/client';
import { Profile } from '@/types/database.types';
import { User, Mail, MapPin, Calendar, Phone } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';

export default function MovieTeamList() {
  const [movieTeamMembers, setMovieTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchMovieTeamMembers();
  }, []);

  const fetchMovieTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'movie_team')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMovieTeamMembers(data || []);
    } catch (err) {
      setError('Failed to load event operations members');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-[#195ADC]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <User className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Team</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (movieTeamMembers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <User className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Event Operations Members</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          There are no event operations accounts in the database yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Event Operations Members
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {movieTeamMembers.length} {movieTeamMembers.length === 1 ? 'member' : 'members'} found
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {movieTeamMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Card className="p-4 hover:shadow-md transition-shadow duration-200 border-gray-200">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-lg font-semibold">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-gray-900 truncate">
                    {member.full_name}
                  </h4>
                  
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{member.city}</span>
                    </div>

                    {member.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}

                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{member.phone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        Joined {new Date(member.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Event Operations
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
