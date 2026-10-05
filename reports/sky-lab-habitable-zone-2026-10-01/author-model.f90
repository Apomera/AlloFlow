!************************************************************************************
! This code calculates habitable zone 'fluxes' using the expression given in the 
! Kopparapu et al.(2014) paper. The corresponding output file is 'HZs.dat'. 
! It also generates a file 'HZ_coefficients.dat' that gives the coefficients for 
! the analytical expression.

!
!
! Ravi kumar Kopparapu April 19 2014
!************************************************************************************

implicit none
real *8 seff(6),seffsun(6),teff,a(6),b(6),c(6),d(6),tstar
integer i

!************************************************************************************
! Output files.

open(9,file='HZs.dat')
open(10,file='HZ_coefficients.dat')

!************************************************************************************
! Coeffcients to be used in the analytical expression to calculate habitable zone flux 
! boundaries


seffsun(1) = 1.776  
seffsun(2) = 1.107
seffsun(3) = 0.356
seffsun(4) = 0.320
seffsun(5) = 1.188
seffsun(6) = 0.99 

a(1) = 2.136e-4
a(2) = 1.332e-4
a(3) = 6.171e-5
a(4) = 5.547e-5
a(5) = 1.433e-4
a(6) = 1.209e-4

b(1) = 2.533e-8
b(2) = 1.580e-8
b(3) = 1.698e-9
b(4) = 1.526e-9
b(5) = 1.707e-8
b(6) = 1.404e-8

c(1) = -1.332e-11
c(2) = -8.308e-12
c(3) = -3.198e-12
c(4) = -2.874e-12
c(5) = -8.968e-12
c(6) = -7.418e-12

d(1) = -3.097e-15
d(2) = -1.931e-15
d(3) = -5.575e-16
d(4) = -5.011e-16
d(5) = -2.084e-15
d(6) = -1.713e-15


!************************************************************************************
! Writing coefficients into 'HZ_coefficients.dat' file

write(10,*)'# The coefficients are as follows. The columns, i, are arranged according to'
write(10,*)'# the HZ limits given in the paper.'
write(10,*)'#'
write(10,*)'# i = 1 --> Recent Venus'
write(10,*)'# i = 2 --> Runaway Greenhouse'
write(10,*)'# i = 3 --> Maximum Greenhouse'
write(10,*)'# i = 4 --> Early Mars'
write(10,*)'# i = 5 --> Runaway Greenhouse for 5 ME'
write(10,*)'# i = 6 --> Runaway Greenhouse for 0.1 ME'

write(10,*)'# First row: S_effSun(i) '
write(10,*)'# Second row: a(i)'
write(10,*)'# Third row:  b(i)'
write(10,*)'# Fourth row: c(i)'
write(10,*)'# Fifth row:  d(i)'
write(10,200)(seffsun(i),i=1,6)
write(10,200)(a(i),i=1,6)
write(10,200)(b(i),i=1,6)
write(10,200)(c(i),i=1,6)
write(10,200)(d(i),i=1,6)

!************************************************************************************
! Calculating HZ fluxes for stars with 2600 K < T_eff < 7200 K. The output file is
! 'HZ_fluxes.dat'

teff  = 2600.0d0
write(9,90)
90 format('#', 2x,'Teff(K)',8x,'Recent',8x,'Runaway',&
          7x,'Maximum',8x,'Early',8x,'5ME Runaway',3x,'0.1ME Runaway')
write(9,91)
91 format('#',17x,'Venus',9x,'Greenhouse',4x,'Greenhouse',5x,'Mars',&
          9x,'Greenhouse',3x,'Greenhouse')

do while(teff <=7201.0d0)
  tstar = teff - 5780.0d0

  do i = 1,6
     seff(i) = seffsun(i) + a(i)*tstar + b(i)*tstar**2 + c(i)*tstar**3 + d(i)*tstar**4
!     print *,seff(i),teff
  enddo
  write(9,100)teff,(seff(i),i=1,6)
!  print *,''
  teff = teff + 200.0d0
enddo

print *,'************************************************************'
print *,''
print *,'The HZ coefficients are printed in HZ_coefficients.dat file.'
print *,'HZs for stars with 2600 K <= Teff <=7200 K is in HZs.dat file.'
print *,''
print *,'************************************************************'

100 format(1p8e14.5)
200 format(1p8e14.5)


close(9)
close(10)
end
