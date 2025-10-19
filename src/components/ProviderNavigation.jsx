import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Icon,
  HStack,
  Text,
  Avatar,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiUsers,
  FiFileText,
  FiCalendar,
  FiSettings,
  FiLogOut,
  FiChevronDown,
} from 'react-icons/fi';
import { getUser } from '../api';

const ProviderNavigation = () => {
  const navigate = useNavigate();
  const user = getUser();
  const menuBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/login');
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<FiChevronDown />}
        variant="ghost"
        size="lg"
      >
        <HStack spacing={3}>
          <Avatar
            size="sm"
            name={user?.full_name || 'Doctor'}
            bg="blue.500"
          />
          <Box display={{ base: 'none', md: 'block' }}>
            <Text fontSize="sm" fontWeight="semibold">
              {user?.full_name || 'Doctor'}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Provider
            </Text>
          </Box>
        </HStack>
      </MenuButton>
      <MenuList bg={menuBg} borderColor={borderColor} boxShadow="lg">
        <MenuItem
          icon={<Icon as={FiActivity} />}
          onClick={() => navigate('/provider-dashboard')}
        >
          Provider Dashboard
        </MenuItem>
        <MenuItem
          icon={<Icon as={FiUsers} />}
          onClick={() => navigate('/dashboard')}
        >
          Patient Dashboard
        </MenuItem>
        <MenuItem
          icon={<Icon as={FiFileText} />}
          onClick={() => navigate('/reviews')}
        >
          Medical Reviews
        </MenuItem>
        <MenuItem
          icon={<Icon as={FiCalendar} />}
          onClick={() => navigate('/create-encounter')}
        >
          Create Encounter
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon={<Icon as={FiSettings} />}
          onClick={() => navigate('/settings')}
        >
          Settings
        </MenuItem>
        <MenuItem
          icon={<Icon as={FiLogOut} />}
          onClick={handleLogout}
          color="red.500"
        >
          Logout
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

export default ProviderNavigation;
